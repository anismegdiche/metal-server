/* eslint-disable init-declarations */
import { AmazonS3Storage, FileTypeFromBuffer } from '../providers/AmazonS3Storage'
import { S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../../modules/errors/HttpErrors"
import { TConfigSource } from "../../source/types/TConfigSource"
import { DATA_PROVIDER } from "../../source/@consts"
import typia from 'typia'

// Mock AWS S3 Client
jest.mock('@aws-sdk/client-s3', () => {
    return {
        S3Client: jest.fn(),
        GetObjectCommand: jest.fn((params) => ({ ...params })),
        PutObjectCommand: jest.fn((params) => ({ ...params })),
        DeleteObjectCommand: jest.fn((params) => ({ ...params })),
        ListObjectsV2Command: jest.fn((params) => ({ ...params }))
    }
})

// Mock the Logger decorator
jest.mock('../../../utils/Logger', () => ({
    Logger: {
        LogFunction: () => () => { },
        Debug: () => () => { },
        Warn: () => () => { },
        Error: () => () => { }
    }
}))

const rndParams = typia.random<TConfigSource>()

let fileTypeFromBuffer: jest.Mock;

beforeAll(async () => {
    // Mock FileTypeFromBuffer
    fileTypeFromBuffer = jest.fn().mockResolvedValue({
        ext: 'txt',
        mime: 'text/plain'
    });

    (FileTypeFromBuffer as any) = fileTypeFromBuffer;
    await FileTypeFromBuffer;
})

describe('AmazonS3Storage', () => {
    let storage: AmazonS3Storage
    const mockConfig: TConfigSource = {
        ...rndParams,
        provider: DATA_PROVIDER.FILES,
        host: 's3.amazonaws.com',
        options: {
            "s3-access-key-id": 'test-key',
            "s3-secret-access-key": 'test-secret',
            "s3-region": 'us-east-1',
            "s3-bucket": 'test-bucket',
            "s3-endpoint": 'http://localhost:9000'
        }
    }

    beforeAll(async () => {
        // Initialize FileTypeFromBuffer
        await FileTypeFromBuffer
    })

    beforeEach(() => {
        jest.clearAllMocks()
        storage = new AmazonS3Storage()
        storage.SetConfig(mockConfig)
    })

    describe('Connect', () => {
        it('should connect successfully with valid credentials', async () => {
            const mockS3Client = {
                send: jest.fn().mockResolvedValue({})
            } as unknown as S3Client

            // Set up the S3Client mock
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client)

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
                send: jest.fn().mockResolvedValue({
                    $metadata: {},
                    ContentLength: 100,
                    $response: {
                        statusCode: 200
                    }
                })
            };

            // Set up the S3Client mock
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client)

            await storage.Connect()
            const exists = await storage.FileIsExist('test.txt')
            expect(exists).toBe(true)
            expect(mockS3Client.send).toHaveBeenCalledWith(mockCommand)
        })

        it('should return false for non-existing file', async () => {
            const mockCommand = {
                Bucket: 'test-bucket',
                Key: 'nonexistent.txt'
            }

            const mockS3Client = {
                send: jest.fn().mockRejectedValue({
                    $metadata: {},
                    name: 'NoSuchKey',
                    code: 'NoSuchKey',
                    message: 'The specified key does not exist.',
                    $response: {
                        statusCode: 404
                    }
                })
            };

            // Set up the S3Client mock
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client)

            await storage.Connect()
            const exists = await storage.FileIsExist('nonexistent.txt')
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
                send: jest.fn().mockResolvedValue({
                    $metadata: {},
                    Body: mockStream,
                    ContentType: 'application/octet-stream',
                    $response: {
                        statusCode: 200
                    }
                })
            } as unknown as S3Client

            // Set up the S3Client mock
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client)

            await storage.Connect()
            const stream = await storage.FileRead('test.txt')

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
                send: jest.fn().mockRejectedValue({
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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client)

            await storage.Connect()
            await expect(storage.FileRead('nonexistent.txt'))
                .rejects.toThrow(HttpErrorNotFound)
        })
    })

    describe('Write', () => {
        it('should write file successfully', async () => {
            const mockS3Client = {
                send: jest.fn().mockResolvedValue({
                    $metadata: {},
                    ETag: 'test-etag',
                    $response: {
                        statusCode: 200
                    }
                })
            } as unknown as S3Client

            // Set up the S3Client mock
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client)

            await storage.Connect()
            const content = new Readable()
            content.push('test content')
            content.push(null)

            await storage.FileWrite('test.txt', content)
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
            const mockCommand = {
                Bucket: 'test-bucket'
            }

            const mockS3Client = {
                send: jest.fn().mockResolvedValue({
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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client)

            await storage.Connect()
            const result = await storage.FileList()

            expect(result.Rows).toEqual([
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
                send: jest.fn().mockRejectedValue({
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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client)

            await storage.Connect()
            await expect(storage.FileList()).rejects.toThrow(HttpErrorInternalServerError)
        })
    })
})
