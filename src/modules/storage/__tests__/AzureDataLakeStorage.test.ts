import { mock_Logger } from "../../../__tests__/mockers"
mock_Logger()

import { DataLakeFileClient, DataLakeFileSystemClient, DataLakeServiceClient } from '@azure/storage-file-datalake'
import { Readable } from 'stream'
import type { Mock, Mocked } from "vitest"
import { HttpErrorInternalServerError } from '../../../modules/errors/HttpErrors'
import { DataTable } from '../../../types/DataTable'
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { DATA_PROVIDER } from "../../source/@consts"
import type { TConfigSource } from "../../source/types/TConfigSource"
import { AzureDataLakeStorage } from '../providers/AzureDataLakeStorage'

// Mock dependencies
vi.mock('@azure/storage-file-datalake')
vi.mock('../../../utils/ReadableUtils')

const rndParams = {
    provider: DATA_PROVIDER.STORAGE,
    host: 'test.datalake.core.windows.net',
} as unknown as TConfigSource

describe('AzureDataLakeStorage', () => {
    let storage: AzureDataLakeStorage
    let mockServiceClient: Mocked<DataLakeServiceClient>
    let mockFileSystemClient: Mocked<DataLakeFileSystemClient>
    let mockFileClient: Mocked<DataLakeFileClient>

    beforeEach(() => {
        vi.clearAllMocks()

        // Setup mocks
        mockFileClient = {
            getProperties: vi.fn(),
            read: vi.fn(),
            create: vi.fn(),
            append: vi.fn(),
            flush: vi.fn(),
        } as unknown as Mocked<DataLakeFileClient>

        mockFileSystemClient = {
            createIfNotExists: vi.fn(),
            getFileClient: vi.fn().mockReturnValue(mockFileClient),
            listPaths: vi.fn(),
        } as unknown as Mocked<DataLakeFileSystemClient>

        mockServiceClient = {
            getFileSystemClient: vi.fn().mockReturnValue(mockFileSystemClient),
        } as unknown as Mocked<DataLakeServiceClient>;

        (DataLakeServiceClient.fromConnectionString as Mock).mockReturnValue(mockServiceClient)

        storage = new AzureDataLakeStorage()
        storage.SetConfig({
            ...rndParams,
            options: {
                'az-datalake-storage-account': 'testaccount',
                'az-datalake-container-name': 'testcontainer',
                'az-datalake-storage-key': 'teststoragekey',
            }
        })
    })

    describe('Init', () => {
        it('should initialize parameters from configuration', () => {
            storage.Init()

            // Verify the params are correctly extracted from config
            expect(storage.Params).toEqual({
                storageAccount: 'testaccount',
                containerName: 'testcontainer',
                storageKey: 'teststoragekey',
            })
        })

        it('should throw error when no configuration is provided', () => {
            storage.ConfigStorage = undefined
            expect(() => storage.Init()).toThrow(HttpErrorInternalServerError)
            expect(() => storage.Init()).toThrow('AzureDataLakeStorage: No configuration defined')
        })
    })

    describe('Connect', () => {
        it('should successfully establish connection with valid parameters', async () => {
            storage.Init()
            await storage.Connect()

            // Test that internal state is set up correctly
            // This indirectly tests that connection was successful
            await expect(storage.FileIsExist('', 'test.txt')).resolves.not.toThrow()
        })

        it('should throw error if Connect is called without initializing Params', async () => {
            storage.Params = undefined
            await expect(storage.Connect()).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should throw error if storage account is missing', async () => {
            storage.Init()
            storage.Params = {
                storageAccount: '',
                containerName: 'testcontainer',
                storageKey: 'teststoragekey',
            }

            const promise = storage.Connect()

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should throw error when Azure connection fails', async () => {
            storage.Init();
            (DataLakeServiceClient.fromConnectionString as Mock).mockImplementation(() => {
                throw new Error('Connection failed')
            })

            const promise = storage.Connect()

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
            await expect(promise).rejects.toThrow('Failed to connect to Azure Data Lake Storage: Connection failed')
        })
    })

    describe('Disconnect', () => {
        it('should clear connection state on disconnect', async () => {
            // First establish connection
            storage.Init()
            await storage.Connect()

            // Verify connection works before disconnect
            mockFileClient.getProperties.mockResolvedValue({} as any)
            await expect(storage.FileIsExist('', 'test.txt')).resolves.toBe(true)

            // Disconnect
            await storage.Disconnect()

            // Verify operations fail after disconnect
            await expect(storage.FileIsExist('', 'test.txt')).rejects.toThrow(
                'AzureDataLakeStorage: Connection to storage not established'
            )
        })
    })

    describe('IsExist', () => {
        it('should return true when file exists', async () => {
            storage.Init()
            await storage.Connect()
            mockFileClient.getProperties.mockResolvedValue({} as any)

            const exists = await storage.FileIsExist('', 'test.txt')

            expect(exists).toBe(true)
        })

        it('should return false when file does not exist', async () => {
            storage.Init()
            await storage.Connect()

            const error = new Error('Resource not found');
            (error as any).code = 'ResourceNotFound'
            mockFileClient.getProperties.mockRejectedValue(error)

            const exists = await storage.FileIsExist('', 'nonexistent.txt')

            expect(exists).toBe(false)
        })

        it('should throw error for non-connection errors', async () => {
            storage.Init()
            await storage.Connect()
            mockFileClient.getProperties.mockRejectedValue(new Error('Unknown error'))

            const promise = storage.FileIsExist('', 'test.txt')

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
            await expect(promise).rejects.toThrow('Failed to check file existence: Error: Unknown error')
        })
    })

    describe('Read', () => {
        it('should return readable stream when reading file', async () => {
            const mockReadable = new Readable()
            storage.Init()
            await storage.Connect()
            mockFileClient.read.mockResolvedValue({
                readableStreamBody: mockReadable
            } as any)

            const result = await storage.FileRead('', 'test.txt')

            // Verify the stream is returned correctly
            expect(result).toBe(mockReadable)
        })

        it('should propagate read errors with proper error message', async () => {
            storage.Init()
            await storage.Connect()
            mockFileClient.read.mockRejectedValue(new Error('Read failed'))

            const promise = storage.FileRead('', 'test.txt')

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Write', () => {
        it('should complete the writing process successfully', async () => {
            const mockContent = new Readable()
            const mockBuffer = Buffer.from('test content')
            storage.Init()
            await storage.Connect();

            (ReadableUtils.ToBuffer as Mock).mockResolvedValue(mockBuffer)

            // All of these need to resolve for Write to complete
            mockFileClient.create.mockResolvedValue({} as any)
            mockFileClient.append.mockResolvedValue({} as any)
            mockFileClient.flush.mockResolvedValue({} as any)

            // Test the full write operation completes without error
            await expect(storage.FileWrite('', 'test.txt', mockContent)).resolves.not.toThrow()
        })

        it('should handle errors in buffer conversion', async () => {
            const mockContent = new Readable()
            storage.Init()
            await storage.Connect();

            (ReadableUtils.ToBuffer as Mock).mockRejectedValue(new Error('Buffer conversion failed'))

            const promise = storage.FileWrite('', 'test.txt', mockContent)

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should handle errors in file creation', async () => {
            const mockContent = new Readable()
            storage.Init()
            await storage.Connect();

            (ReadableUtils.ToBuffer as Mock).mockResolvedValue(Buffer.from('test'))
            mockFileClient.create.mockRejectedValue(new Error('Create failed'))

            const promise = storage.FileWrite('', 'test.txt', mockContent)

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('ListFiles', () => {
        it('should convert folder and file items to the correct format', async () => {
            storage.Init()
            await storage.Connect()

            // Mock the async iterator response
            const mockItems = [
                {
                    name: 'file1.txt',
                    isDirectory: false,
                    contentLength: 100,
                    createdOn: new Date(),
                    lastModified: new Date()
                },
                {
                    name: 'folder1',
                    isDirectory: true,
                    createdOn: new Date(),
                    lastModified: new Date()
                }
            ]

            mockFileSystemClient.listPaths.mockReturnValue({
                [Symbol.asyncIterator]: async function* () {
                    yield* mockItems;
                },
                byPage: () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            values: mockItems,
                            continuationToken: undefined
                        };
                    },
                    byPage: () => {
                        throw new Error('Not implemented');
                    }
                })
            } as any);

            const result = await storage.FolderListFiles()

            // Verify data transformation logic
            expect(result).toBeInstanceOf(DataTable)
            expect(await result.Rows()).toEqual([
                {
                    name: 'file1.txt',
                    type: 'file',
                    mimeType: 'text/plain',
                    path: 'file1.txt',
                    size: 100,
                    createdAt: expect.any(Date),
                    modifiedAt: expect.any(Date),
                },
            ])
        })

        it('should handle empty folder correctly', async () => {
            storage.Init()
            await storage.Connect()

            // Mock empty folder
            mockFileSystemClient.listPaths.mockReturnValue({
                [Symbol.asyncIterator]: async function* () {
                    yield* [];
                },
                byPage: () => ({
                    [Symbol.asyncIterator]: async function* () {
                        yield {
                            values: [],
                            continuationToken: undefined
                        };
                    },
                    byPage: () => {
                        throw new Error('Not implemented');
                    }
                })
            } as any);

            const result = await storage.FolderListFiles()

            // Verify empty result
            expect(await result.Rows()).toEqual([])
        })

        it('should propagate listing errors', async () => {
            storage.Init()
            await storage.Connect()

            mockFileSystemClient.listPaths.mockImplementation(() => {
                throw new Error('List failed')
            })

            const promise = storage.FolderListFiles()

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
        })
    })
})