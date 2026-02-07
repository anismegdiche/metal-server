


import { S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { type Mock } from 'vitest'
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../../modules/errors/HttpErrors"
import type { U_config_sources_source } from '../../core/types/U_config_sources'
import { DATA_PROVIDER } from "../../source/@consts"
import { AmazonS3Storage, FileTypeFromBuffer } from '../providers/AmazonS3Storage'

vi.mock('load-esm', () => ({
    loadEsm: vi.fn(async (name: string) => {
        if (name === 'file-type') {
            return {
                fileTypeFromBuffer: vi.fn().mockResolvedValue({
                    ext: 'txt',
                    mime: 'text/plain'
                })
            }
        }
    })
}))

// Mock AWS S3 Client
vi.mock('@aws-sdk/client-s3', () => {
    return {
        S3Client: vi.fn(function () { }),
        GetObjectCommand: vi.fn(function (params) { return { ...params } }),
        PutObjectCommand: vi.fn(function (params) { return { ...params } }),
        DeleteObjectCommand: vi.fn(function (params) { return { ...params } }),
        ListObjectsV2Command: vi.fn(function (params) { return { ...params } }),
        CopyObjectCommand: vi.fn(function (params) { return { ...params } })
    }
})

// Base mock configuration for tests
const baseParams: Partial<U_config_sources_source> = {
    host: '127.0.0.1',
    port: 3306,
    user: 'test-user',
    password: 'test-password',
    database: 'test-db'
}

// let fileTypeFromBuffer: Mock; // Removed unused

beforeAll(async () => {
    // Wait for the real FileTypeFromBuffer promise to resolve (controlled by our load-esm mock)
    await FileTypeFromBuffer;
})

describe('AmazonS3Storage', () => {
    let storage: AmazonS3Storage
    const mockConfig: U_config_sources_source = {
        ...baseParams,
        provider: DATA_PROVIDER.STORAGE,
        host: 's3.amazonaws.com',
        options: {
            "s3-access-key-id": 'test-key',
            "s3-secret-access-key": 'test-secret',
            "s3-region": 'us-east-1',
            "s3-bucket": 'test-bucket',
            "s3-endpoint": 'http://127.0.0.1:9000'
        }
    }

    beforeAll(async () => {
        // Initialize FileTypeFromBuffer
        await FileTypeFromBuffer
    })

    beforeEach(() => {
        vi.clearAllMocks()
        storage = new AmazonS3Storage()
        storage.SetConfig(mockConfig)
    })

    describe('Connect', () => {
        it('should connect successfully with valid credentials', async () => {
            const mockS3Client = {
                send: vi.fn().mockResolvedValue({})
            } as unknown as S3Client

            // Set up the S3Client mock
            (S3Client as Mock).mockImplementation(function () { return mockS3Client })

            await storage.Connect()
        })

        it('should throw error with missing configuration', async () => {
            const storageWithoutConfig = new AmazonS3Storage()
            await expect(storageWithoutConfig.Connect()).rejects
                .toThrow(HttpErrorInternalServerError)
        })
    })

    describe('IsExist', () => {
        it('should return true for existing file', async () => {
            const mockCommand = {
                Bucket: 'test-bucket',
                Key: 'test.txt'
            }

            const mockS3Client = {
                send: vi.fn().mockResolvedValue({
                    $metadata: {},
                    ContentLength: 100,
                    $response: {
                        statusCode: 200
                    }
                })
            };

            // Set up the S3Client mock
            (S3Client as Mock).mockImplementation(function () { return mockS3Client })

            await storage.Connect()
            const exists = await storage.FileIsExist('', 'test.txt')
            expect(exists).toBe(true)
            expect(mockS3Client.send).toHaveBeenCalledWith(mockCommand)
        })

        it('should return false for non-existing file', async () => {
            const mockCommand = {
                Bucket: 'test-bucket',
                Key: 'nonexistent.txt'
            }

            const noSuchKeyError = new Error('The specified key does not exist.')
            noSuchKeyError.name = 'NoSuchKey'
            ;(noSuchKeyError as any).code = 'NoSuchKey'

            const mockS3Client = {
                send: vi.fn().mockRejectedValue(noSuchKeyError)
            };

            // Set up the S3Client mock
            (S3Client as Mock).mockImplementation(function () { return mockS3Client })

            await storage.Connect()
            const exists = await storage.FileIsExist('', 'nonexistent.txt')
            expect(exists).toBe(false)
            expect(mockS3Client.send).toHaveBeenCalledWith(mockCommand)
        })
    })

    describe('Read', () => {
        it('should read file successfully', async () => {
            const mockStream = new Readable()
            mockStream.push('test content')
            mockStream.push(null)

            const mockS3Client = {
                send: vi.fn().mockResolvedValue({
                    $metadata: {},
                    Body: mockStream,
                    ContentType: 'application/octet-stream',
                    $response: {
                        statusCode: 200
                    }
                })
            } as unknown as S3Client

            // Set up the S3Client mock
            (S3Client as Mock).mockImplementation(function () { return mockS3Client })

            await storage.Connect()
            const stream = await storage.FileRead('', 'test.txt')

            const chunks: string[] = []
            for await (const chunk of stream) {
                chunks.push(chunk.toString())
            }

            expect(chunks.join('')).toBe('test content')
            expect(mockS3Client.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: 'test-bucket',
                    Key: 'test.txt'
                })
            )
        })

        it('should throw error for non-existing file', async () => {
            const mockS3Client = {
                send: vi.fn().mockRejectedValue({
                    $metadata: {},
                    name: 'NoSuchKey',
                    code: 'NoSuchKey',
                    message: 'The specified key does not exist.',
                    $response: {
                        error: {
                            code: 'NoSuchKey',
                            message: 'The specified key does not exist.'
                        },
                        statusCode: 404
                    }
                })
            } as unknown as S3Client

            // Set up the S3Client mock
            (S3Client as Mock).mockImplementation(function () { return mockS3Client })

            await storage.Connect()
            await expect(storage.FileRead('', 'nonexistent.txt'))
                .rejects.toThrow(HttpErrorNotFound)
        })
    })

    describe('Write', () => {
        it('should write file successfully', async () => {
            const mockS3Client = {
                send: vi.fn().mockResolvedValue({
                    $metadata: {},
                    ETag: 'test-etag',
                    $response: {
                        statusCode: 200
                    }
                })
            } as unknown as S3Client

            // Set up the S3Client mock
            (S3Client as Mock).mockImplementation(function () { return mockS3Client })

            await storage.Connect()
            const content = new Readable()
            content.push('test content')
            content.push(null)

            await storage.FileWrite('', 'test.txt', content)
            expect(mockS3Client.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: 'test-bucket',
                    Key: 'test.txt',
                    Body: expect.any(Readable),
                    ContentType: 'text/plain'
                })
            )
        })
    })

    describe('ListFiles', () => {
        it('should list files successfully', async () => {

            const mockS3Client = {
                send: vi.fn().mockResolvedValue({
                    $metadata: {},
                    Contents: [
                        {
                            Key: 'file1.txt',
                            Size: 100,
                            LastModified: new Date()
                        },
                        {
                            Key: 'dir/file2.txt',
                            Size: 200,
                            LastModified: new Date()
                        }
                    ],
                    $response: {
                        statusCode: 200
                    }
                })
            };

            // Set up the S3Client mock
            (S3Client as Mock).mockImplementation(function () { return mockS3Client })

            await storage.Connect()
            const result = await storage.FolderListFiles()

            expect(await result.Rows()).toEqual([
                {
                    name: 'file1.txt',
                    type: 'file',
                    size: 100,
                    mimeType: 'text/plain',
                    modifiedAt: expect.any(Date),
                    path: 'file1.txt'
                }
            ])
        })

        it('should handle error when listing files', async () => {
            const mockS3Client = {
                send: vi.fn().mockRejectedValue({
                    $metadata: {},
                    name: 'InternalError',
                    code: 'InternalError',
                    message: 'Internal Error',
                    $response: {
                        error: {
                            code: 'InternalError',
                            message: 'Internal Error'
                        },
                        statusCode: 500
                    }
                })
            } as unknown as S3Client

            // Set up the S3Client mock
            (S3Client as Mock).mockImplementation(function () { return mockS3Client })

            await storage.Connect()
            await expect(storage.FolderListFiles()).rejects.toThrow(HttpErrorInternalServerError)
        })
    })
})
