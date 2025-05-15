/* eslint-disable init-declarations */
import mysql from 'mysql2/promise'
import { MySqlData } from '../MySqlData'
import { TSchemaRequest } from '../../../types/TSchemaRequest'
import { Cache } from '../../../server/Cache'
import { DataTable } from '../../../types/DataTable'
import { HttpErrorInternalServerError, HttpErrorNotFound } from '../../../server/HttpErrors'
import { TConfigSource } from "../../../types/TConfig"
import { DATA_PROVIDER } from "../../DataProvider"

// Mock the mysql2/promise module
jest.mock('mysql2/promise')

// Mock the Cache module
jest.mock('../../../server/Cache')
jest.mock('../../../server/Step')
jest.mock('../MemoryData', () => {
    return {
        MemoryData: jest.fn().mockImplementation(() => {
            return {
                EscapeEntity: jest.fn(),
                EscapeField: jest.fn(),
                Init: jest.fn(),
                Connect: jest.fn(),
                Disconnect: jest.fn(),
                ListEntities: jest.fn(),
                Select: jest.fn(),
                Insert: jest.fn(),
                Update: jest.fn(),
                Delete: jest.fn()
            }
        })
    }
})

// Mock the Logger
jest.mock('../../../utils/Logger', () => ({
    Logger: {
        LogFunction: () => () => { },
        Debug: jest.fn(),
        Warn: jest.fn(),
        Error: jest.fn(),
        Info: jest.fn()
    }
}))

describe('MySqlData', () => {
    let provider: MySqlData
    const mockPool = {
        query: jest.fn(),
        end: jest.fn()
    }
    const mockCreatePool = mysql.createPool as jest.Mock

    const providerConfig: TConfigSource = {
        provider: DATA_PROVIDER.MYSQL,
        host: 'localhost',
        port: 3306,
        user: 'test-user',
        // file deepcode ignore NoHardcodedPasswords/test: testing
        password: 'test-password',
        database: 'test-db',
        options: {
            waitForConnections: true,
            connectionLimit: 10,
            maxIdle: 10,
            idleTimeout: 60000,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        }
    }

    beforeEach(async () => {
        // Reset all mocks before each test
        jest.clearAllMocks()
        jest.resetModules()
        
        mockCreatePool.mockReturnValue(mockPool)
        mockPool.query.mockResolvedValue([[{ dummy: 'data' }]])

        // Create a new provider instance with test configuration
        provider = new MySqlData()
        await provider.Init('test-source', providerConfig)
        // Connect after initialization
        await provider.Connect()
    })

    describe('Init and Connection', () => {
        it('should successfully initialize and connect', async () => {
            expect(mockCreatePool).toHaveBeenCalledWith(expect.objectContaining({
                host: 'localhost',
                database: 'test-db',
                user: 'test-user',
                password: 'test-password',
                waitForConnections: true,
                connectionLimit: 10,
                maxIdle: 10,
                idleTimeout: 60000,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            }))

            expect(mockPool.query).toHaveBeenCalledWith('SELECT 1')
        })

        it('should throw error on connection failure', async () => {
            mockCreatePool.mockImplementationOnce(() => {
                throw new Error('Connection failed')
            })

            const newProvider = new MySqlData()
            await newProvider.Init('test-source', providerConfig)
            await expect(newProvider.Connect()).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Insert Operations', () => {
        it('should successfully insert data', async () => {
            const dt = new DataTable('test-table', [
                {
                    id: 1,
                    name: 'test'
                }
            ])
            const mockInsertRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                data: dt.Rows
            }

            const response = await provider.Insert(mockInsertRequest)

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO `test-table`')
            )
            expect(response.StatusCode).toBe(201)
            expect(Cache.Remove).toHaveBeenCalledWith(mockInsertRequest)
        })

        it('should throw error when data is missing', async () => {
            const mockInsertRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table'
            }

            await expect(provider.Insert(mockInsertRequest)).rejects.toThrow('test-schema: data is missing')
        })
    })

    describe('Select Operations', () => {
        it('should successfully select data', async () => {
            const mockSelectRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                cache: 30
            }

            mockPool.query.mockResolvedValueOnce([
                [
                    {
                        id: 1,
                        name: 'test'
                    }
                ]
            ])

            const response = await provider.Select(mockSelectRequest)

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM `test-table`')
            )
            expect(response.StatusCode).toBe(200)
            expect(response.Body?.data).toBeDefined()
            expect(response.Body?.data.Rows).toHaveLength(1)
        })

        it('should handle empty result set', async () => {
            const mockSelectRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table'
            }

            mockPool.query.mockResolvedValueOnce([[]])

            const response = await provider.Select(mockSelectRequest)
            expect(response.Body?.data.Rows).toHaveLength(0)
        })
    })

    describe('ListEntities Operations', () => {
        it('should successfully list entities', async () => {
            const mockListRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: '',
                cache: 30
            }

            const mockTables = [
                {
                    name: 'table1',
                    type: 'table',
                    size: 100
                },
                {
                    name: 'table2',
                    type: 'table',
                    size: 200
                }
            ]

            mockPool.query.mockResolvedValueOnce([mockTables])

            const response = await provider.ListEntities(mockListRequest)

            expect(response.StatusCode).toBe(200)
            expect(response.Body?.data.Rows).toHaveLength(2)
            expect(mockPool.query).toHaveBeenCalled()
        })

        it('should throw NotFound when no entities exist', async () => {
            const mockListRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: ''
            }

            mockPool.query.mockResolvedValueOnce([[]])

            await expect(provider.ListEntities(mockListRequest))
                .rejects.toThrow(HttpErrorNotFound)
        })
    })
    // Add these test cases to the existing test suite

    describe('Update Operations', () => {
        it('should successfully update data', async () => {
            const dt = new DataTable('test-table', [
                {
                    id: 1,
                    name: 'updated'
                }
            ])
            const mockUpdateRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                data: dt.Rows,
                filter: {
                    id: 1
                }
            }

            const response = await provider.Update(mockUpdateRequest)

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE `test-table` SET')
            )
            expect(response.StatusCode).toBe(204)
            expect(Cache.Remove).toHaveBeenCalledWith(mockUpdateRequest)
        })

        it('should throw error when update data is missing', async () => {
            const mockUpdateRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                filter: { id: 1 }
            }

            await expect(provider.Update(mockUpdateRequest))
                .rejects.toThrow('test-schema: data is missing')
        })

        it('should handle update with filter condition', async () => {
            const dt = new DataTable('test-table', [
                {
                    name: 'updated'
                }
            ])
            const mockUpdateRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                data: dt.Rows,
                "filter-expression": 'id > 5'
            }

            await provider.Update(mockUpdateRequest)

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringMatching(/UPDATE.*WHERE.*id > 5/)
            )
        })
    })

    describe('Delete Operations', () => {
        it('should successfully delete data', async () => {
            const mockDeleteRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                filter: { id: 1 }
            }

            const response = await provider.Delete(mockDeleteRequest)

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM `test-table`')
            )
            expect(response.StatusCode).toBe(204)
            expect(Cache.Remove).toHaveBeenCalledWith(mockDeleteRequest)
        })

        it('should handle delete with complex filter condition', async () => {
            const mockDeleteRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                "filter-expression": "name LIKE '%test%' AND id > 10"
            }

            await provider.Delete(mockDeleteRequest)

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringMatching(/DELETE FROM.*WHERE.*name LIKE '%test%' AND id > 10/)
            )
        })

        it('should handle delete without filter', async () => {
            const mockDeleteRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table'
            }

            await provider.Delete(mockDeleteRequest)

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringMatching(/DELETE FROM `test-table`/)
            )
        })
    })

    describe('Disconnect Operation', () => {
        it('should successfully disconnect', async () => {
            await provider.Disconnect()
            expect(mockPool.end).toHaveBeenCalled()
        })

        it('should handle disconnect when not connected', async () => {
            provider.Connection = undefined
            await provider.Disconnect()
            expect(mockPool.end).not.toHaveBeenCalled()
        })

        it('should handle disconnect errors gracefully', async () => {
            mockPool.end.mockRejectedValueOnce(new Error('Disconnect failed'))
            await provider.Disconnect()
            // Should not throw error
            expect(mockPool.end).toHaveBeenCalled()
        })
    })

    describe('Escape Functions', () => {
        it('should correctly escape entity names', () => {
            const result = provider.EscapeEntity('test-table')
            expect(result).toBe('`test-table`')
        })

        it('should correctly escape field names', () => {
            const result = provider.EscapeField('user_id')
            expect(result).toBe('`user_id`')
        })
    })

    describe('Cache Integration', () => {
        it('should set cache for select operations when cache is enabled', async () => {
            const mockSelectRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table',
                cache: 60
            }

            mockPool.query.mockResolvedValueOnce([
                [
                    {
                        id: 1,
                        name: 'test'
                    }
                ]
            ])

            await provider.Select(mockSelectRequest)

            expect(Cache.Set).toHaveBeenCalledWith(
                mockSelectRequest,
                expect.any(DataTable)
            )
        })

        it('should not set cache for select operations when cache is disabled', async () => {
            const mockSelectRequest: TSchemaRequest = {
                schema: 'test-schema',
                entity: 'test-table'
            }

            mockPool.query.mockResolvedValueOnce([
                [
                    {
                        id: 1,
                        name: 'test'
                    }
                ]
            ])

            await provider.Select(mockSelectRequest)

            expect(Cache.Set).not.toHaveBeenCalled()
        })
    })
})