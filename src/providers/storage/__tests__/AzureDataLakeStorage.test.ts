/* eslint-disable  */
import { Readable } from 'stream'
import { DataLakeServiceClient, DataLakeFileSystemClient, DataLakeFileClient } from '@azure/storage-file-datalake'
import { AzureDataLakeStorage } from '../AzureDataLakeStorage' // Adjust path
import { HttpErrorInternalServerError } from '../../../server/HttpErrors'
import { ReadableHelper } from '../../../lib/ReadableHelper'
import { Logger } from '../../../utils/Logger'
import { DataTable } from '../../../types/DataTable'
import typia from "typia"
import { TConfigSource } from "../../../types/TConfig"

// Mock dependencies
jest.mock('@azure/storage-file-datalake')
jest.mock('../../../lib/ReadableHelper')
jest.mock('../../../utils/Logger')

const rndParams = typia.random<TConfigSource>()

describe('AzureDataLakeStorage', () => {
    let storage: AzureDataLakeStorage
    let mockServiceClient: jest.Mocked<DataLakeServiceClient>
    let mockFileSystemClient: jest.Mocked<DataLakeFileSystemClient>
    let mockFileClient: jest.Mocked<DataLakeFileClient>

    beforeEach(() => {
        jest.clearAllMocks()

        // Setup mocks
        mockFileClient = {
            getProperties: jest.fn(),
            read: jest.fn(),
            create: jest.fn(),
            append: jest.fn(),
            flush: jest.fn(),
        } as unknown as jest.Mocked<DataLakeFileClient>

        mockFileSystemClient = {
            createIfNotExists: jest.fn(),
            getFileClient: jest.fn().mockReturnValue(mockFileClient),
            listPaths: jest.fn(),
        } as unknown as jest.Mocked<DataLakeFileSystemClient>

        mockServiceClient = {
            getFileSystemClient: jest.fn().mockReturnValue(mockFileSystemClient),
        } as unknown as jest.Mocked<DataLakeServiceClient>;

        (DataLakeServiceClient.fromConnectionString as jest.Mock).mockReturnValue(mockServiceClient)

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
                'az-datalake-storage-account': 'testaccount',
                'az-datalake-container-name': 'testcontainer',
                'az-datalake-storage-key': 'teststoragekey',
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
            await expect(storage.IsExist('test.txt')).resolves.not.toThrow()
        })

        it('should throw error if Connect is called without initializing Params', async () => {
            storage.Params = undefined

            const promise = storage.Connect()

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
            await expect(promise).rejects.toThrow('AzureDataLakeStorage: No params defined')
        })

        it('should throw error if storage account is missing', async () => {
            storage.Init()
            storage.Params = {
                'az-datalake-storage-account': '',
                'az-datalake-container-name': 'testcontainer',
                'az-datalake-storage-key': 'teststoragekey',
            }

            const promise = storage.Connect()

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
            await expect(promise).rejects.toThrow('AzureDataLakeStorage: Missing required configuration')
        })

        it('should throw error when Azure connection fails', async () => {
            storage.Init();
            (DataLakeServiceClient.fromConnectionString as jest.Mock).mockImplementation(() => {
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
            await expect(storage.IsExist('test.txt')).resolves.toBe(true)

            // Disconnect
            await storage.Disconnect()

            // Verify operations fail after disconnect
            await expect(storage.IsExist('test.txt')).rejects.toThrow(
                'AzureDataLakeStorage: Connection to storage not established'
            )
        })
    })

    describe('IsExist', () => {
        it('should return true when file exists', async () => {
            storage.Init()
            await storage.Connect()
            mockFileClient.getProperties.mockResolvedValue({} as any)

            const exists = await storage.IsExist('test.txt')

            expect(exists).toBe(true)
        })

        it('should return false when file does not exist', async () => {
            storage.Init()
            await storage.Connect()

            const error = new Error('Resource not found');
            (error as any).code = 'ResourceNotFound'
            mockFileClient.getProperties.mockRejectedValue(error)

            const exists = await storage.IsExist('nonexistent.txt')

            expect(exists).toBe(false)
        })

        it('should throw error for non-connection errors', async () => {
            storage.Init()
            await storage.Connect()
            mockFileClient.getProperties.mockRejectedValue(new Error('Unknown error'))

            const promise = storage.IsExist('test.txt')

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

            const result = await storage.Read('test.txt')

            // Verify the stream is returned correctly
            expect(result).toBe(mockReadable)
        })

        it('should propagate read errors with proper error message', async () => {
            storage.Init()
            await storage.Connect()
            mockFileClient.read.mockRejectedValue(new Error('Read failed'))

            const promise = storage.Read('test.txt')

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
            await expect(promise).rejects.toThrow('Failed to read file: Read failed')
        })
    })

    describe('Write', () => {
        it('should complete the writing process successfully', async () => {
            const mockContent = new Readable()
            const mockBuffer = Buffer.from('test content')
            storage.Init()
            await storage.Connect();

            (ReadableHelper.ToBuffer as jest.Mock).mockResolvedValue(mockBuffer)

            // All of these need to resolve for Write to complete
            mockFileClient.create.mockResolvedValue({} as any)
            mockFileClient.append.mockResolvedValue({} as any)
            mockFileClient.flush.mockResolvedValue({} as any)

            // Test the full write operation completes without error
            await expect(storage.Write('test.txt', mockContent)).resolves.not.toThrow()
        })

        it('should handle errors in buffer conversion', async () => {
            const mockContent = new Readable()
            storage.Init()
            await storage.Connect();

            (ReadableHelper.ToBuffer as jest.Mock).mockRejectedValue(new Error('Buffer conversion failed'))

            const promise = storage.Write('test.txt', mockContent)

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
            await expect(promise).rejects.toThrow('Failed to write file: Buffer conversion failed')
        })

        it('should handle errors in file creation', async () => {
            const mockContent = new Readable()
            storage.Init()
            await storage.Connect();

            (ReadableHelper.ToBuffer as jest.Mock).mockResolvedValue(Buffer.from('test'))
            mockFileClient.create.mockRejectedValue(new Error('Create failed'))

            const promise = storage.Write('test.txt', mockContent)

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
            await expect(promise).rejects.toThrow('Failed to write file: Create failed')
        })
    })

    describe('List', () => {
        it('should convert directory and file items to the correct format', async () => {
            storage.Init()
            await storage.Connect()

            // Mock the async iterator response
            const mockItems = [
                { name: 'file1.txt', isDirectory: false },
                { name: 'folder1', isDirectory: true }
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

            const result = await storage.List()

            // Verify data transformation logic
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([
                { name: 'file1.txt', type: 'file' },
                { name: 'folder1', type: 'directory' }
            ])
        })

        it('should handle empty directory correctly', async () => {
            storage.Init()
            await storage.Connect()

            // Mock empty directory
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

            const result = await storage.List()

            // Verify empty result
            expect(result.Rows).toEqual([])
        })

        it('should propagate listing errors', async () => {
            storage.Init()
            await storage.Connect()

            mockFileSystemClient.listPaths.mockImplementation(() => {
                throw new Error('List failed')
            })

            const promise = storage.List()

            await expect(promise).rejects.toThrow(HttpErrorInternalServerError)
            await expect(promise).rejects.toThrow('Failed to list files: List failed')
        })
    })
})