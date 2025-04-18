/* eslint-disable init-declarations */
import { AmazonS3Storage } from '../AmazonS3Storage'
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../../server/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { TFilesDataOptions } from "../../data/FilesData"
import { TConfigSource } from "../../../types/TConfig"
import typia from 'typia'

// Mock AWS S3 Client
jest.mock('@aws-sdk/client-s3', () => {
    return {
        S3Client: jest.fn(),
        GetObjectCommand: jest.fn((params) => ({...params})),
        PutObjectCommand: jest.fn((params) => ({...params})),
        DeleteObjectCommand: jest.fn((params) => ({...params})),
        ListObjectsV2Command: jest.fn((params) => ({...params}))
    }
})

const rndParams = typia.random<TConfigSource>()

describe('AmazonS3Storage', () => {
    let storage: AmazonS3Storage
    const mockConfig: TConfigSource = {
        ...rndParams,
        options: {
            "s3-access-key-id": 'test-key',
            "s3-secret-access-key": 'test-secret',
            "s3-region": 'us-east-1',
            "s3-bucket": 'test-bucket',
            "s3-endpoint": 'http://localhost:9000'
        }
    }

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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

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
            };
            
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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

            await storage.Connect();
            const exists = await storage.IsExist('test.txt');
            expect(exists).toBe(true);
            expect(mockS3Client.send).toHaveBeenCalledWith(mockCommand);
        });

        it('should return false for non-existing file', async () => {
            const mockCommand = {
                Bucket: 'test-bucket',
                Key: 'nonexistent.txt'
            };

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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

            await storage.Connect();
            const exists = await storage.IsExist('nonexistent.txt');
            expect(exists).toBe(false);
            expect(mockS3Client.send).toHaveBeenCalledWith(mockCommand);
        });
    });

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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

            await storage.Connect()
            const stream = await storage.Read('test.txt')

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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

            await storage.Connect()
            await expect(storage.Read('nonexistent.txt'))
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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

            await storage.Connect()
            const content = new Readable()
            content.push('test content')
            content.push(null)

            await storage.Write('test.txt', content)
            expect(mockS3Client.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: 'test-bucket',
                    Key: 'test.txt',
                    Body: expect.any(Readable),
                    ContentType: 'application/octet-stream'
                })
            )
        })
    })

    describe('List', () => {
        it('should list files successfully', async () => {
            const mockCommand = {
                Bucket: 'test-bucket'
            };

            const mockS3Client = {
                send: jest.fn().mockResolvedValue({
                    $metadata: {},
                    Contents: [
                        {
                            Key: 'file1.txt',
                            Size: 100,
                            LastModified: new Date(),
                            ETag: 'test-etag'
                        },
                        {
                            Key: 'file2.txt',
                            Size: 200,
                            LastModified: new Date(),
                            ETag: 'test-etag'
                        }
                    ],
                    $response: {
                        statusCode: 200
                    }
                })
            };

            // Set up the S3Client mock
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

            await storage.Connect();
            const result = await storage.List();

            expect(result.Rows).toEqual([
                {
                    name: 'file1.txt',
                    type: 'file',
                    size: 100
                },
                {
                    name: 'file2.txt',
                    type: 'file',
                    size: 200
                }
            ]);
            expect(mockS3Client.send).toHaveBeenCalledWith(mockCommand);
        });

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
            (S3Client as jest.Mock).mockImplementation(() => mockS3Client);

            await storage.Connect()
            await expect(storage.List()).rejects.toThrow(HttpErrorInternalServerError)
        })
    })
})
