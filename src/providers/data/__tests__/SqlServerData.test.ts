/* eslint-disable no-console */
/* eslint-disable init-declarations */
import { SqlServerData } from "../../../providers/data/SqlServerData"
import { TConfigSource } from "../../../types/TConfig"
import { TSchemaRequestSelect, TSchemaRequestInsert, TSchemaRequestUpdate, TSchemaRequestDelete, TSchemaRequestListEntities } from "../../../types/TSchemaRequest"
import { HttpErrorInternalServerError, HttpErrorBadRequest, HttpErrorNotFound } from "../../../server/HttpErrors"
import { TIpPort } from "../../../types/TIpPort"
import { DATA_PROVIDER } from "../../../providers/DataProvider"
import { TJson } from "../../../types/TJson"
import { HTTP_STATUS_CODE } from "../../../lib/Const"
import { Cache } from '../../../server/Cache'
import { Logger } from "../../../utils/Logger"
import mssql from 'mssql'

// Mock mssql module
jest.mock('mssql', () => {
    return {
        connect: jest.fn()
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

// mock console.warn
console.warn = jest.fn()

// Mock Cache
jest.mock('../../../server/Cache', () => ({
    Cache: {
        Set: jest.fn(),
        Remove: jest.fn(() => Promise.resolve())
    }
}))

const mockConfig: TConfigSource = {
    provider: DATA_PROVIDER.MSSQL,
    host: 'localhost',
    port: 1433 as TIpPort,
    user: 'testuser',
    password: 'testpass',
    database: 'testdb',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
}

describe('SqlServerData', () => {
    let sqlServerData: SqlServerData

    const mockSchemaRequest: TSchemaRequestSelect = {
        schema: 'test_schema',
        entity: 'test_entity'
    }

    beforeEach(() => {
        sqlServerData = new SqlServerData()
        jest.clearAllMocks()
        const mockConnection = {
            query: jest.fn()
        }
        const mockConnect = jest.fn().mockResolvedValue(mockConnection)
        jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)
    })

    describe('Init', () => {
        it('should initialize with provided configuration', async () => {
            await sqlServerData.Init('test', mockConfig)
            expect(sqlServerData.SourceName).toBe('test')
            expect(sqlServerData.ProviderName).toBe(DATA_PROVIDER.MSSQL)
            expect(sqlServerData.Config).toEqual({
                ...mockConfig,
                provider: DATA_PROVIDER.MSSQL
            })
        })

        it('should throw error when source name is empty', async () => {
            await expect(sqlServerData.Init('', mockConfig))
                .rejects
                .toThrow('source name is missing')
        })

        it('should throw error when configuration is missing', async () => {
            await expect(sqlServerData.Init('test', undefined as unknown as TConfigSource))
                .rejects
                .toThrow('source config is missing')
        })

        it('should merge configuration with defaults', async () => {
            const partialConfig: TConfigSource = {
                provider: DATA_PROVIDER.MSSQL,
                host: 'localhost',
                database: 'testdb'
            }
            await sqlServerData.Init('test', partialConfig)
            expect(sqlServerData.SourceName).toBe('test')
            expect(sqlServerData.ProviderName).toBe(DATA_PROVIDER.MSSQL)
            expect(sqlServerData.Config).toEqual({
                ...sqlServerData.DEFAULT,
                ...partialConfig,
                provider: DATA_PROVIDER.MSSQL
            })
        })

        it('should throw error when source name is null', async () => {
            await expect(sqlServerData.Init(null as unknown as string, mockConfig))
                .rejects
                .toThrow('source name is missing')
        })

        it('should throw error when configuration is null', async () => {
            await expect(sqlServerData.Init('test', null as unknown as TConfigSource))
                .rejects
                .toThrow('source config is missing')
        })
    })

    describe('Connect', () => {
        it('should establish connection successfully', async () => {
            const mockConnection = {
                query: jest.fn()
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            expect(sqlServerData.Connection).toBeDefined()
            expect(sqlServerData.Connection).toBe(mockConnection)
            expect(mssql.connect).toHaveBeenCalledWith({
                server: mockConfig.host,
                port: mockConfig.port,
                user: mockConfig.user,
                password: mockConfig.password,
                database: mockConfig.database,
                options: mockConfig.options
            })
        })

        it('should handle connection error gracefully', async () => {
            const mockError = new HttpErrorInternalServerError('Connection failed')
            const mockConnect = jest.fn().mockRejectedValue(mockError)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            const sqlServerData = new SqlServerData()
            await sqlServerData.Init('test', mockConfig)

            await sqlServerData.Connect()

            expect(sqlServerData.Connection).toBeUndefined()
            expect(Logger.Error).toHaveBeenCalled()
        })

        it('should handle connection configuration properly', async () => {
            const customConfig: TConfigSource = {
                ...mockConfig,
                host: 'custom-host',
                database: 'custom-db',
                options: {
                    encrypt: false,
                    trustServerCertificate: true
                }
            }
            const mockConnection = {
                query: jest.fn()
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', customConfig)
            await sqlServerData.Connect()

            expect(sqlServerData.Connection).toBeDefined()
            expect(sqlServerData.Connection).toBe(mockConnection)
            expect(mssql.connect).toHaveBeenCalledWith({
                server: customConfig.host,
                port: customConfig.port,
                user: customConfig.user,
                password: customConfig.password,
                database: customConfig.database,
                options: customConfig.options
            })
        })

        it('should handle connection error gracefully', async () => {
            const mockError = new HttpErrorInternalServerError('Connection failed')
            const mockConnect = jest.fn().mockRejectedValue(mockError)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            expect(sqlServerData.Connection).toBeUndefined()
            expect(Logger.Error).toHaveBeenCalled()
        })
    })

    describe('Disconnect', () => {
        it('should disconnect successfully when connection exists', async () => {
            const mockConnection = {
                close: jest.fn()
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()
            await sqlServerData.Disconnect()

            expect(mockConnection.close).toHaveBeenCalled()
            expect(sqlServerData.Connection).toBeUndefined()
        })

        it('should handle disconnect gracefully when no connection exists', async () => {
            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Disconnect()
            expect(sqlServerData.Connection).toBeUndefined()
        })
    })

    describe('Select', () => {
        it('should handle select operation successfully', async () => {
            const mockQuery = jest.fn().mockResolvedValue({
                recordset: [
                    {
                        id: 1,
                        name: 'test'
                    }
                ]
            })
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockSelectRequest: TSchemaRequestSelect = {
                ...mockSchemaRequest,
                entity: 'test_entity'
            }

            const result = await sqlServerData.Select(mockSelectRequest)
            expect(result).toBeDefined()
            expect(result.StatusCode).toBe(HTTP_STATUS_CODE.OK)
            expect(result.Body).toBeDefined()
            expect(mockQuery).toHaveBeenCalled()
        })

        it('should handle select operation with empty result', async () => {
            const mockQuery = jest.fn().mockResolvedValue({ recordset: [] })
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockSelectRequest: TSchemaRequestSelect = {
                ...mockSchemaRequest,
                entity: 'test_entity'
            }

            const result = await sqlServerData.Select(mockSelectRequest)
            expect(result).toBeDefined()
            expect(result.StatusCode).toBe(HTTP_STATUS_CODE.OK)
            expect(result.Body).toBeDefined()
            expect(mockQuery).toHaveBeenCalled()
        })

        it('should throw error when connection is not established', async () => {
            await sqlServerData.Init('test', mockConfig)
            const mockSelectRequest: TSchemaRequestSelect = {
                ...mockSchemaRequest,
                entity: 'test_entity'
            }
            await expect(sqlServerData.Select(mockSelectRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })

        it('should handle query error gracefully', async () => {
            const mockError = new HttpErrorInternalServerError('Query failed')
            const mockQuery = jest.fn().mockRejectedValue(mockError)
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockSelectRequest: TSchemaRequestSelect = {
                ...mockSchemaRequest,
                entity: 'test_entity'
            }

            await expect(sqlServerData.Select(mockSelectRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })

        it('should handle caching correctly', async () => {
            const mockQuery = jest.fn().mockResolvedValue({
                recordset: [
                    {
                        id: 1,
                        name: 'test'
                    }
                ]
            })
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockSelectRequest: TSchemaRequestSelect = {
                ...mockSchemaRequest,
                entity: 'test_entity',
                cache: 300
            }

            await sqlServerData.Select(mockSelectRequest)
            expect(mockQuery).toHaveBeenCalled()
            expect(Cache.Set).toHaveBeenCalled()
        })
    })

    describe('Insert', () => {
        it('should handle insert operation successfully', async () => {
            const mockQuery = jest.fn().mockResolvedValue({})
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockInsertRequest: TSchemaRequestInsert = {
                ...mockSchemaRequest,
                data: { test: 'data' }
            }

            const result = await sqlServerData.Insert(mockInsertRequest)
            expect(result).toBeDefined()
            expect(result.StatusCode).toBe(HTTP_STATUS_CODE.CREATED)
            expect(mockQuery).toHaveBeenCalled()
            expect(Cache.Remove).toHaveBeenCalledWith(mockInsertRequest)
        })

        it('should throw error when data is missing', async () => {
            const mockQuery = jest.fn().mockResolvedValue({})
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockInsertRequest: TSchemaRequestInsert = {
                ...mockSchemaRequest,
                data: undefined as TJson | undefined
            }

            await expect(sqlServerData.Insert(mockInsertRequest))
                .rejects
                .toThrow(HttpErrorBadRequest)
        })

        it('should throw error when connection is not established', async () => {
            await sqlServerData.Init('test', mockConfig)
            const mockInsertRequest: TSchemaRequestInsert = {
                ...mockSchemaRequest,
                data: { test: 'data' }
            }
            await expect(sqlServerData.Insert(mockInsertRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })

        it('should handle query error gracefully', async () => {
            const mockError = new HttpErrorInternalServerError('Query failed')
            const mockQuery = jest.fn().mockRejectedValue(mockError)
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockInsertRequest: TSchemaRequestInsert = {
                ...mockSchemaRequest,
                data: { test: 'data' }
            }

            await expect(sqlServerData.Insert(mockInsertRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Update', () => {
        it('should handle update operation successfully', async () => {
            const mockQuery = jest.fn().mockResolvedValue({})
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockUpdateRequest: TSchemaRequestUpdate = {
                ...mockSchemaRequest,
                data: { test: 'data' },
                filter: { id: 1 }
            }

            const result = await sqlServerData.Update(mockUpdateRequest)
            expect(result).toBeDefined()
            expect(result.StatusCode).toBe(HTTP_STATUS_CODE.NO_CONTENT)
            expect(mockQuery).toHaveBeenCalled()
            expect(Cache.Remove).toHaveBeenCalledWith(mockUpdateRequest)
        })

        it('should throw error when data is missing', async () => {
            const mockQuery = jest.fn().mockResolvedValue({})
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockUpdateRequest: TSchemaRequestUpdate = {
                ...mockSchemaRequest,
                data: undefined as TJson | undefined,
                filter: { id: 1 }
            }

            await expect(sqlServerData.Update(mockUpdateRequest))
                .rejects
                .toThrow(HttpErrorBadRequest)
        })

        it('should throw error when connection is not established', async () => {
            await sqlServerData.Init('test', mockConfig)
            const mockUpdateRequest: TSchemaRequestUpdate = {
                ...mockSchemaRequest,
                data: { test: 'data' },
                filter: { id: 1 }
            }
            await expect(sqlServerData.Update(mockUpdateRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })

        it('should handle query error gracefully', async () => {
            const mockError = new HttpErrorInternalServerError('Query failed')
            const mockQuery = jest.fn().mockRejectedValue(mockError)
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockUpdateRequest: TSchemaRequestUpdate = {
                ...mockSchemaRequest,
                data: { test: 'data' },
                filter: { id: 1 }
            }

            await expect(sqlServerData.Update(mockUpdateRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Delete', () => {
        it('should handle delete operation successfully', async () => {
            const mockQuery = jest.fn().mockResolvedValue({})
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockDeleteRequest: TSchemaRequestDelete = {
                ...mockSchemaRequest,
                filter: { id: 1 }
            }

            const result = await sqlServerData.Delete(mockDeleteRequest)
            expect(result).toBeDefined()
            expect(result.StatusCode).toBe(HTTP_STATUS_CODE.NO_CONTENT)
            expect(mockQuery).toHaveBeenCalled()
            expect(Cache.Remove).toHaveBeenCalledWith(mockDeleteRequest)
        })

        it('should throw error when connection is not established', async () => {
            await sqlServerData.Init('test', mockConfig)
            const mockDeleteRequest: TSchemaRequestDelete = {
                ...mockSchemaRequest,
                filter: { id: 1 }
            }
            await expect(sqlServerData.Delete(mockDeleteRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })

        it('should handle query error gracefully', async () => {
            const mockError = new HttpErrorInternalServerError('Query failed')
            const mockQuery = jest.fn().mockRejectedValue(mockError)
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockDeleteRequest: TSchemaRequestDelete = {
                ...mockSchemaRequest,
                filter: { id: 1 }
            }

            await expect(sqlServerData.Delete(mockDeleteRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })
    })

    describe('ListEntities', () => {
        it('should list entities successfully', async () => {
            const mockQuery = jest.fn().mockResolvedValue({
                recordset: [
                    {
                        name: 'test_table',
                        type: 'table',
                        size: 1
                    }
                ]
            })
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockListRequest: TSchemaRequestListEntities = {
                schema: 'test_schema'
            }

            const result = await sqlServerData.ListEntities(mockListRequest)
            expect(result).toBeDefined()
            expect(result.StatusCode).toBe(HTTP_STATUS_CODE.OK)
            expect(result.Body).toBeDefined()
            expect(mockQuery).toHaveBeenCalled()
        })

        it('should throw error when entities not found', async () => {
            const mockQuery = jest.fn().mockResolvedValue({ recordset: [] })
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockListRequest: TSchemaRequestListEntities = {
                schema: 'test_schema'
            }

            await expect(sqlServerData.ListEntities(mockListRequest))
                .rejects
                .toThrow(HttpErrorNotFound)
        })

        it('should throw error when connection is not established', async () => {
            await sqlServerData.Init('test', mockConfig)
            const mockListRequest: TSchemaRequestListEntities = {
                schema: 'test_schema'
            }
            await expect(sqlServerData.ListEntities(mockListRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })

        it('should handle query error gracefully', async () => {
            const mockError = new HttpErrorInternalServerError('Query failed')
            const mockQuery = jest.fn().mockRejectedValue(mockError)
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)

            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            const mockListRequest: TSchemaRequestListEntities = {
                schema: 'test_schema'
            }

            await expect(sqlServerData.ListEntities(mockListRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Error Handling', () => {
        it('should handle query error', async () => {
            const mockQuery = jest.fn().mockRejectedValue(new HttpErrorInternalServerError('Query failed'))
            const mockConnection = {
                query: mockQuery
            }
            const mockConnect = jest.fn().mockResolvedValue(mockConnection)
            jest.spyOn(mssql, 'connect').mockImplementation(mockConnect)
            await sqlServerData.Init('test', mockConfig)
            await sqlServerData.Connect()

            await expect(sqlServerData.Select(mockSchemaRequest))
                .rejects
                .toThrow(HttpErrorInternalServerError)
        })
    })
})
