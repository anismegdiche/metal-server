/* eslint-disable */
import * as Sha512 from 'js-sha512'
import { Cache } from '../Cache'
import { DataTable } from '../../../types/DataTable'
import { TSchemaRequest, TSchemaRequestSelect } from '../../schema/types/TSchemaRequest'
import { DataProvider } from '../../source/DataProvider'
import { absDataProvider } from '../../source/base/absDataProvider'
import { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { TypeUtils } from "../../../utils/TypeUtils"
import { TCacheData } from "../types/TCacheData"
import { TInternalResponse } from "../../schema/types/TInternalResponse"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import { ConfigManager } from '../../core/ConfigManager'

// Mock dependencies
jest.mock('../Config')
jest.mock('../../providers/DataProvider')
jest.mock('../../../utils/Logger', () => ({
    Logger: {
        LogFunction: jest.fn().mockImplementation(() => (_: any, __: any, descriptor: any) => descriptor),
        Debug: jest.fn(),
        Warn: jest.fn(),
        Error: jest.fn(),
        Out: 'OUT:'
    }
}))
jest.mock('../../../utils/SynchronizerManager', () => ({
    SynchronizerManager: {
        Synchronized: jest.fn().mockImplementation(() => (_: any, __: any, descriptor: any) => descriptor)
    }
}))
jest.mock('../../../utils/TypeUtils', () => ({
    TypeHelper: {
        Validate: jest.fn(),
        IsSchemaResponseData: jest.fn()
    }
}))
jest.mock('../Roles')
jest.mock('js-sha512')

describe('Cache', () => {
    let mockProvider: jest.Mocked<absDataProvider>
    let mockDataTable: DataTable

    beforeEach(() => {
        // Reset static properties
        Cache.IsEnabled = false
        Cache.Index = new Map()

        // Setup mocks
        mockProvider = {
            Init: jest.fn(),
            Connect: jest.fn(),
            Disconnect: jest.fn(),
            Select: jest.fn(),
            Insert: jest.fn().mockResolvedValue(undefined),
            Update: jest.fn().mockResolvedValue(undefined),
            Delete: jest.fn().mockResolvedValue(undefined),
            EscapeField: jest.fn(field => `"${field}"`)
        } as unknown as jest.Mocked<absDataProvider>;

        (DataProvider.GetProvider as jest.Mock).mockReturnValue(mockProvider)

        mockDataTable = {
            SetMetaData: jest.fn()
        } as unknown as DataTable;

        // Mock Config
        (ConfigManager.Has as jest.Mock).mockReturnValue(true);
        (ConfigManager.Get as jest.Mock).mockReturnValue({
            database: 'test_cache_db',
            provider: 'test_provider'
        });

        // Mock Sha512
        (Sha512.sha512 as unknown as jest.Mock).mockImplementation(data => `hashed_${data}`)

        // Set Cache.CacheSource to mock provider - needed for many tests
        Cache.DataSource = mockProvider
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('GetHashList', () => {

        // Successfully retrieves hash and expires data from CacheSource and populates Cache.Index
        it('should populate Cache.Index with hash and expires data when CacheSource returns valid data', async () => {
            // Create a proper mock response structure that matches the actual implementation
            const mockRows = [
                { hash: 'hash1', expires: 1000 },
                { hash: 'hash2', expires: 2000 }
            ]

            const dataTable = new DataTable("test", mockRows)

            const mockResponse: TInternalResponse<TSchemaResponse> = {
                StatusCode: 200,
                Body: {
                    schema: 'test_cache_db',
                    entity: 'cache',
                    status: HTTP_STATUS_CODE.OK,
                    data: dataTable
                }
            }

            mockProvider.Select.mockResolvedValue(mockResponse)
            jest.spyOn(TypeUtils, 'IsSchemaResponseData').mockReturnValue(true)

            // Act
            await Cache.GetHashList()

            // Assert
            expect(Cache.Index.size).toBe(2)
            expect(Cache.Index.get('hash1')).toBe(1000)
            expect(Cache.Index.get('hash2')).toBe(2000)
        })

        // Correctly maps TCacheData rows to a Map with hash as key and expires as value
        it('should correctly map TCacheData rows to Map entries with hash as key and expires as value', async () => {
            const mockRows = [
                { hash: 'abc123', expires: 1234567890 },
                { hash: 'def456', expires: 9876543210 }
            ]

            const dataTable = new DataTable("test", mockRows)

            const mockResponse: TInternalResponse<TSchemaResponse> = {
                StatusCode: 200,
                Body: {
                    schema: 'test_cache_db',
                    entity: 'cache',
                    status: HTTP_STATUS_CODE.OK,
                    data: dataTable
                }
            }

            mockProvider.Select.mockResolvedValue(mockResponse)
            jest.spyOn(TypeUtils, 'IsSchemaResponseData').mockReturnValue(true)

            // Act
            await Cache.GetHashList()

            // Assert
            expect(Cache.Index instanceof Map).toBe(true)
            expect(Cache.Index.get('abc123')).toBe(1234567890)
            expect(Cache.Index.get('def456')).toBe(9876543210)
        })

        // Properly handles valid schema response data through TypeHelper.IsSchemaResponseData check
        it('should use TypeHelper.IsSchemaResponseData to validate schema response', async () => {
            const mockRows = [{ hash: 'hash1', expires: 1000 }]
            const dataTable = new DataTable("test", mockRows)

            const mockResponse: TInternalResponse<TSchemaResponse> = {
                StatusCode: 200,
                Body: {
                    schema: 'test_cache_db',
                    entity: 'cache',
                    status: HTTP_STATUS_CODE.OK,
                    data: dataTable
                }
            }

            mockProvider.Select.mockResolvedValue(mockResponse)
            const isSchemaResponseDataSpy = jest.spyOn(TypeUtils, 'IsSchemaResponseData').mockReturnValue(true)

            // Act
            await Cache.GetHashList()

            // Assert
            expect(isSchemaResponseDataSpy).toHaveBeenCalledWith(mockResponse.Body)
            expect(Cache.Index.size).toBe(1)
        })

        // Uses the private CacheSchemaRequest with added fields parameter for Select operation
        it('should use private CacheSchemaRequest with added fields parameter for Select operation', async () => {
            // Arrange
            const dataTable = new DataTable("test", [])

            const mockResponse: TInternalResponse<TSchemaResponse> = {
                StatusCode: 200,
                Body: {
                    schema: 'test_cache_db',
                    entity: 'cache',
                    status: HTTP_STATUS_CODE.OK,
                    data: dataTable
                }
            }

            const selectSpy = jest.spyOn(Cache.DataSource, 'Select').mockResolvedValue(mockResponse)
            jest.spyOn(TypeUtils, 'IsSchemaResponseData').mockReturnValue(true)

            // Act
            await Cache.GetHashList()

            // Assert
            expect(selectSpy).toHaveBeenCalledWith(expect.objectContaining({
                schema: Cache.Database,
                entity: Cache.Entity,
                fields: "hash,expires"
            }))
        })

        // Catches and handles any exceptions during CacheSource.Select by setting Cache.Index to empty Map
        it('should set Cache.Index to empty Map when CacheSource.Select throws an exception', async () => {
            // Arrange
            jest.spyOn(Cache.DataSource, 'Select').mockRejectedValue(new Error('Database connection error'))

            // Set initial state to verify it changes
            Cache.Index = new Map([['existing', 123]])
            expect(Cache.Index.size).toBe(1)

            // Act
            await Cache.GetHashList()

            // Assert
            expect(Cache.Index.size).toBe(0)
            expect(Cache.Index instanceof Map).toBe(true)
        })

        // Handles case where TypeHelper.IsSchemaResponseData returns false
        it('should set Cache.Index to empty Map when TypeHelper.IsSchemaResponseData returns false', async () => {
            const dataTable = new DataTable("test", [{ hash: 'hash1', expires: 1000 }])

            const mockResponse: TInternalResponse<TSchemaResponse> = {
                StatusCode: 200,
                Body: {
                    schema: 'test_cache_db',
                    entity: 'cache',
                    status: HTTP_STATUS_CODE.OK,
                    data: dataTable
                }
            }

            jest.spyOn(Cache.DataSource, 'Select').mockResolvedValue(mockResponse)
            jest.spyOn(TypeUtils, 'IsSchemaResponseData').mockReturnValue(false)

            // Set initial state to verify it changes
            Cache.Index = new Map([['existing', 123]])
            expect(Cache.Index.size).toBe(1)

            // Act
            await Cache.GetHashList()

            // Assert
            expect(Cache.Index.size).toBe(0)
            expect(Cache.Index instanceof Map).toBe(true)
        })

        // Only requests hash and expires fields to optimize data transfer
        it('should only request hash and expires fields to optimize data transfer', async () => {
            // Arrange
            const dataTable = new DataTable("test", [])

            const mockResponse: TInternalResponse<TSchemaResponse> = {
                StatusCode: 200,
                Body: {
                    schema: 'test_cache_db',
                    entity: 'cache',
                    status: HTTP_STATUS_CODE.OK,
                    data: dataTable
                }
            }

            const selectSpy = jest.spyOn(Cache.DataSource, 'Select').mockResolvedValue(mockResponse)
            jest.spyOn(TypeUtils, 'IsSchemaResponseData').mockReturnValue(true)

            // Act
            await Cache.GetHashList()

            // Assert
            expect(selectSpy).toHaveBeenCalledWith(expect.objectContaining({
                fields: "hash,expires"
            }))
            expect(selectSpy).toHaveBeenCalledWith(expect.not.objectContaining({
                fields: expect.stringMatching(/schema|entity|schemaRequest|data/)
            }))
        })
    })

    describe('Connect', () => {
        it('should connect to cache provider and get hash list when enabled', async () => {
            Cache.IsEnabled = true

            // Set up a proper mock for GetHashList
            const mockRows = [
                { hash: 'hash1', expires: 1000 },
                { hash: 'hash2', expires: 2000 }
            ]

            const dataTable = new DataTable("test", mockRows)

            const mockResponse: TInternalResponse<TSchemaResponse> = {
                StatusCode: 200,
                Body: {
                    schema: 'test_cache_db',
                    entity: 'cache',
                    status: HTTP_STATUS_CODE.OK,
                    data: dataTable
                }
            }

            mockProvider.Select.mockResolvedValue(mockResponse)
            jest.spyOn(TypeUtils, 'IsSchemaResponseData').mockReturnValue(true)

            await Cache.Connect()

            expect(mockProvider.Connect).toHaveBeenCalled()
            expect(mockProvider.Select).toHaveBeenCalled()
            // After connect, GetHashList is called which should populate the cache
            expect(Cache.Index.size).toBe(2)
            expect(Cache.Index.get('hash1')).toBe(1000)
            expect(Cache.Index.get('hash2')).toBe(2000)
        })

        it('should not connect when cache is disabled', async () => {
            Cache.IsEnabled = false

            await Cache.Connect()

            expect(mockProvider.Connect).not.toHaveBeenCalled()
        })
    })

    describe('Set', () => {
        beforeEach(() => {
            Cache.IsEnabled = true
            jest.spyOn(Date.prototype, 'getTime').mockReturnValue(2000)
            jest.spyOn(Date.prototype, 'setSeconds').mockReturnValue(0)
        })

        it('should insert new cache entry when hash does not exist', async () => {
            const schemaRequest: TSchemaRequest = {
                schema: 'test_schema',
                entity: 'test_entity',
                cache: 300,
                source: 'should_be_removed'
            }

            jest.spyOn(Cache, 'IsHashExists').mockResolvedValue(false)

            await Cache.Set(schemaRequest, mockDataTable)

            // Check source was removed
            expect(mockProvider.Insert).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([
                    expect.not.objectContaining({
                        schemaRequest: expect.objectContaining({
                            source: 'should_be_removed'
                        })
                    })
                ])
            }))

            // Verify the hash, schema, entity, and data are set correctly
            expect(mockProvider.Insert).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        hash: expect.any(String),
                        schema: 'test_schema',
                        entity: 'test_entity',
                        data: mockDataTable
                    })
                ])
            }))

            expect(mockDataTable.SetMetaData).toHaveBeenCalledTimes(2)
            expect(Cache.Index.size).toBe(1)
        })

        it('should update cache entry when hash exists but is expired', async () => {
            const schemaRequest: TSchemaRequest = {
                schema: 'test_schema',
                entity: 'test_entity',
                cache: 300
            }

            jest.spyOn(Cache, 'IsHashExists').mockResolvedValue(true)
            jest.spyOn(Cache, 'GetExpires').mockResolvedValue(1000)
            jest.spyOn(Cache, 'IsCacheValid').mockReturnValue(false)
            jest.spyOn(Cache, 'Update').mockResolvedValue(undefined)

            await Cache.Set(schemaRequest, mockDataTable)

            expect(Cache.Update).toHaveBeenCalled()
            expect(Cache.Index.size).toBe(1)
        })
    })

    describe('Get', () => {
        let mockSchemaRequest: TSchemaRequestSelect

        beforeEach(() => {
            Cache.IsEnabled = true
            mockSchemaRequest = {
                schema: 'test_schema',
                entity: 'test_entity',
                cache: 300,
                fields: 'field1,field2'
            };

            // Mock TypeHelper.Validate not to throw
            (TypeUtils.Validate as jest.Mock).mockImplementation(() => true);

            // Mock Roles.CheckPermission not to throw
            (require('../Roles').Roles.CheckPermission as jest.Mock).mockImplementation(() => true)
        })

        it('should return cached data when valid cache exists', async () => {
            jest.spyOn(Cache, 'IsArgumentsValid').mockReturnValue(true)
            jest.spyOn(Cache, 'GetExpires').mockResolvedValue(3000)
            jest.spyOn(Cache, 'IsCacheValid').mockReturnValue(true)

            const cachedDataTable = new DataTable("test", { someData: 'value' })

            // Create a proper mock response structure for a TCacheData row
            const mockRow: TCacheData = {
                hash: 'test_hash',
                expires: 3000,
                schema: 'test_schema',
                entity: 'test_entity',
                schemaRequest: mockSchemaRequest,
                data: cachedDataTable
            }

            const dataTable = new DataTable("test", [mockRow])

            const mockResponse: TInternalResponse<TSchemaResponse> = {
                StatusCode: 200,
                Body: {
                    schema: 'test_cache_db',
                    entity: 'cache',
                    status: HTTP_STATUS_CODE.OK,
                    data: dataTable
                }
            }

            mockProvider.Select.mockResolvedValue(mockResponse)

            const result = await Cache.Get(mockSchemaRequest)

            expect(mockProvider.Select).toHaveBeenCalled()
            expect(result).toEqual(expect.objectContaining({
                Body: expect.objectContaining({
                    entity: 'test_entity',
                    schema: 'test_schema',
                    data: cachedDataTable
                })
            }))
        })

        it('should return undefined when no data found in cache', async () => {
            jest.spyOn(Cache, 'IsArgumentsValid').mockReturnValue(true)
            jest.spyOn(Cache, 'GetExpires').mockResolvedValue(3000)
            jest.spyOn(Cache, 'IsCacheValid').mockReturnValue(true)

            // Empty array of rows
            const dataTable = new DataTable("test", [])

            const mockResponse: TInternalResponse<TSchemaResponse> = {
                StatusCode: 200,
                Body: {
                    schema: 'test_cache_db',
                    entity: 'cache',
                    status: HTTP_STATUS_CODE.OK,
                    data: dataTable
                }
            }

            mockProvider.Select.mockResolvedValue(mockResponse)

            const result = await Cache.Get(mockSchemaRequest)

            expect(result).toBeUndefined()
        })
    })

    describe('Clean', () => {
        beforeEach(() => {
            Cache.IsEnabled = true

            Cache.Index.set('hash1', 500)  // expired
            Cache.Index.set('hash2', 1500) // not expired

            jest.spyOn(Date.prototype, 'getTime').mockReturnValue(1000)
        })

        it('should delete expired cache entries and update index', async () => {
            const mockResponse: TInternalResponse<any> = {
                StatusCode: 204,
                Body: null
            }

            mockProvider.Delete.mockResolvedValue(mockResponse)

            const result = await Cache.Clean()

            expect(mockProvider.Delete).toHaveBeenCalledWith(expect.objectContaining({
                schema: Cache.Database,
                entity: Cache.Entity,
                'filter-expression': expect.stringContaining('expires < 1000')
            }))

            expect(Cache.Index.has('hash1')).toBe(false)
            expect(Cache.Index.has('hash2')).toBe(true)

            expect(result.Body).toEqual({ message: 'Cache cleaned' })
        })
    })
})