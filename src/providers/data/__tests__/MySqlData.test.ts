import mysql from 'mysql2/promise'
import { MySqlDataProvider } from '../MySqlDataProvider'
import { TSchemaRequest } from '../../../types/TSchemaRequest'
import { Cache } from '../../../server/Cache'
import { DataTable } from '../../../types/DataTable'
import { HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from '../../../server/HttpErrors'
import { TConfigSource } from "../../../types/TConfig"

// Mock the mysql2/promise module
jest.mock('mysql2/promise')
// Mock the Cache module
jest.mock('../../../server/Cache')

describe('MySqlDataProvider', () => {
    // eslint-disable-next-line init-declarations
    let provider: MySqlDataProvider
    const mockPool = {
        query: jest.fn(),
        end: jest.fn()
    }
    const mockCreatePool = mysql.createPool as jest.Mock

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks()
        mockCreatePool.mockReturnValue(mockPool)
        mockPool.query.mockResolvedValue([[{ dummy: 'data' }]])

        // Create a new provider instance with test configuration
        provider = new MySqlDataProvider('test-source', <TConfigSource>{
            host: 'localhost',
            port: 3306,
            user: 'test-user',
            // file deepcode ignore NoHardcodedPasswords/test: testing purpose
            password: 'test-password',
            database: 'test-db'
        })
    })

    describe('Init and Connection', () => {
        it('should successfully initialize and connect', async () => {
            await provider.Init()

            expect(mockCreatePool).toHaveBeenCalledWith(expect.objectContaining({
                host: 'localhost',
                database: 'test-db',
                waitForConnections: true,
                connectionLimit: 10
            }))
        })

        it('should throw error on connection failure', async () => {
            mockCreatePool.mockImplementationOnce(() => {
                throw new Error('Connection failed')
            })

            await expect(provider.Connect()).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should successfully disconnect', async () => {
            await provider.Connect()
            await provider.Disconnect()

            expect(mockPool.end).toHaveBeenCalled()
        })
    })

    describe('Insert Operations', () => {
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

        it('should successfully insert data', async () => {
            const response = await provider.Insert(mockInsertRequest)

            expect(mockPool.query).toHaveBeenCalled()
            expect(response.StatusCode).toBe(201)
            expect(Cache.Remove).toHaveBeenCalledWith(mockInsertRequest)
        })

        it('should throw error on insert failure', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('Insert failed'))

            await expect(provider.Insert(mockInsertRequest))
                .rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Select Operations', () => {
        const mockSelectRequest: TSchemaRequest = {
            schema: 'test-schema',
            entity: 'test-table',
            cache: 60
        }

        it('should successfully select data', async () => {
            const response = await provider.Select(mockSelectRequest)

            expect(mockPool.query).toHaveBeenCalled()
            expect(response.StatusCode).toBe(200)
            expect(response.Body?.data).toBeDefined()
        })

        it('should cache results when cache option is true', async () => {
            await provider.Select(mockSelectRequest)

            expect(Cache.Set).toHaveBeenCalled()
        })

        it('should handle empty result set', async () => {
            mockPool.query.mockResolvedValueOnce([[]])

            const response = await provider.Select(mockSelectRequest)
            expect(response.Body?.data.Rows).toHaveLength(0)
        })
    })

    describe('Update Operations', () => {
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
            filter: { id: 1 }
        }

        it('should successfully update data', async () => {
            const response = await provider.Update(mockUpdateRequest)

            expect(mockPool.query).toHaveBeenCalled()
            expect(response.StatusCode).toBe(204)
            expect(Cache.Remove).toHaveBeenCalledWith(mockUpdateRequest)
        })

        it('should throw error on update failure', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('Update failed'))

            await expect(provider.Update(mockUpdateRequest))
                .rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Delete Operations', () => {
        const mockDeleteRequest: TSchemaRequest = {
            schema: 'test-schema',
            entity: 'test-table',
            filter: { id: 1 }
        }

        it('should successfully delete data', async () => {
            const response = await provider.Delete(mockDeleteRequest)

            expect(mockPool.query).toHaveBeenCalled()
            expect(response.StatusCode).toBe(204)
            expect(Cache.Remove).toHaveBeenCalledWith(mockDeleteRequest)
        })

        it('should throw error on delete failure', async () => {
            mockPool.query.mockRejectedValueOnce(new Error('Delete failed'))

            await expect(provider.Delete(mockDeleteRequest))
                .rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('ListEntities Operations', () => {
        const mockListRequest: TSchemaRequest = {
            schema: 'test-schema',
            entity: '',
            cache: 60
        }

        it('should successfully list entities', async () => {
            mockPool.query.mockResolvedValueOnce([
                [
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
            ])

            const response = await provider.ListEntities(mockListRequest)

            expect(response.StatusCode).toBe(200)
            expect(response.Body?.data.Rows).toHaveLength(2)
        })

        it('should throw NotFound when no entities exist', async () => {
            mockPool.query.mockResolvedValueOnce([[]])

            await expect(provider.ListEntities(mockListRequest))
                .rejects.toThrow(HttpErrorNotFound)
        })

        it('should cache entities list when cache option is true', async () => {
            mockPool.query.mockResolvedValueOnce([
                [
                    {
                        name: 'table1',
                        type: 'table',
                        size: 100
                    }
                ]
            ])

            await provider.ListEntities(mockListRequest)

            expect(Cache.Set).toHaveBeenCalled()
        })
    })

    describe('AddEntity Operations', () => {
        it('should throw NotImplemented error', async () => {
            await expect(provider.AddEntity({} as TSchemaRequest))
                .rejects.toThrow(HttpErrorNotImplemented)
        })
    })
})