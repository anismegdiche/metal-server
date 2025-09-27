import typia from "typia"
import { Readable } from "stream"
import { HttpErrorInternalServerError } from "../../../modules/errors/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { AzureFileStorage, TAzureFileStorageConfig } from "../providers/AzureFileStorage"
import { TConfigSource } from "../../source/types/TConfigSource"
import { ShareServiceClient, ShareDirectoryClient, ShareFileClient } from "@azure/storage-file-share"
import { ReadableUtils } from "../../../utils/ReadableUtils"

// Mock dependencies
jest.mock('../../../utils/Logger', () => ({
    Logger: {
        SetLevel: () => () => { },
        EnableAll: () => () => { },
        DisableAll: () => () => { },
        Log: () => () => { },
        Error: () => () => { },
        Warn: () => () => { },
        Debug: () => () => { },
        Info: () => () => { },
        Message: () => () => { },
        LogFunction: () => () => { },
        Level : "error",
        Out: 'OUT'
    }
}))

const rndParams = typia.random<TConfigSource>()

describe("AzureFileStorage", () => {
    let storage: AzureFileStorage
    let mockFileClient: Partial<ShareFileClient>
    let mockDirectoryClient: Partial<ShareDirectoryClient>

    beforeEach(async () => {
        jest.clearAllMocks()

    // Spy on ReadableUtils.ToBuffer
    jest.spyOn(ReadableUtils, 'ToBuffer').mockResolvedValue(Buffer.from("test content"))

        // Mock the file client
        mockFileClient = {
            exists: jest.fn().mockResolvedValue(true),
            download: jest.fn().mockResolvedValue({
                readableStreamBody: Readable.from(Buffer.from("test content")),
                contentLength: 11
            }),
            create: jest.fn().mockResolvedValue({}),
            uploadRange: jest.fn().mockResolvedValue({})
        }

        // Mock the directory client
        mockDirectoryClient = {
            getFileClient: jest.fn().mockReturnValue(mockFileClient),
            listFilesAndDirectories: jest.fn().mockImplementation(function* () {
                // Empty generator by default
            }),
            createIfNotExists: jest.fn().mockResolvedValue({})
        }

        // Create new storage instance
        storage = new AzureFileStorage()

        // Set the configuration
        storage.SetConfig({
            ...rndParams,
            options: {
                "az-file-connection-string": "test-connection-string",
                "az-file-share-name": "test-share",
                "az-file-folder": "/",
                autocreate: true
            }
        } as TConfigSource)

        // Mock the ShareServiceClient
        const mockShareServiceClient = {
            getShareClient: jest.fn().mockImplementation((_shareName: string) => {
                return {
                    getDirectoryClient: jest.fn().mockReturnValue(mockDirectoryClient)
                }
            })
        } as unknown as ShareServiceClient

        // Mock the fromConnectionString method
        jest.spyOn(ShareServiceClient, "fromConnectionString").mockReturnValue(mockShareServiceClient)

        // Initialize and connect
        storage.Init()
        await storage.Connect()
    })

    describe("Init", () => {
        it("should throw error if required config is missing - empty config", () => {
            const invalidConfig: TConfigSource = {
                ...rndParams,
                options: {}
            }
            const storage = new AzureFileStorage()

            expect(() => storage.SetConfig(invalidConfig)).toThrow(HttpErrorInternalServerError)
        })

        it("should throw error if required config is missing - missing connection string", () => {
            const invalidConfig: TConfigSource = {
                ...rndParams,
                options: { "az-file-share-name": "test" }
            }
            const storage = new AzureFileStorage()

            expect(() => storage.SetConfig(invalidConfig)).toThrow(HttpErrorInternalServerError)
        })

        it("should throw error if required config is missing - missing share name", () => {
            const invalidConfig: TConfigSource = {
                ...rndParams,
                options: { "az-file-connection-string": "test" }
            }
            const storage = new AzureFileStorage()

            expect(() => storage.SetConfig(invalidConfig)).toThrow(HttpErrorInternalServerError)
        })

        it("should properly parse and store configuration", () => {
            expect(storage._connectionString).toBe("test-connection-string")
            expect(storage._shareName).toBe("test-share")
        })

        it("should set default value for folder if missing", () => {
            const invalidConfig: TConfigSource & TAzureFileStorageConfig = {
                ...rndParams,
                options: {
                    "az-file-connection-string": "test",
                    "az-file-share-name": "test"
                }
            }
            const storage = new AzureFileStorage()

            storage.SetConfig(invalidConfig)
            expect(storage._folder).toBe("/")
        })
    })

    describe("Connect", () => {
        it("should throw error if Connect is called without Init", async () => {
            try {
                await storage.Connect()
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError)
            }
        })

        it("should throw error if Connect is called without required config", async () => {
            // Create new storage instance with minimal config
            const newStorage = new AzureFileStorage()
            newStorage.SetConfig({
                ...rndParams,
                options: {
                    "az-file-connection-string": "test",
                    "az-file-share-name": "test-share",
                    "az-file-folder": "/",
                    autocreate: true
                }
            } as TConfigSource)

            newStorage._connectionString = undefined

            try {
                await newStorage.Connect()
            } catch (error) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError)
            }
        })
    })

    describe("File operations", () => {
        describe("IsExist", () => {
            it("should return true for existing file", async () => {
                const exists = await storage.FileIsExist('', 'test.txt')
                expect(exists).toBe(true)
            })

            it("should return false for non-existing file", async () => {
                (mockFileClient.exists as jest.Mock).mockResolvedValueOnce(false)

                const exists = await storage.FileIsExist('', 'nonexistent.txt')
                expect(exists).toBe(false)
            })
        })

        describe("Read", () => {
            it("should return readable stream with correct content", async () => {
                (mockFileClient.download as jest.Mock).mockResolvedValueOnce({
                    readableStreamBody: Readable.from(Buffer.from("test content")),
                    contentLength: 11
                })

                const stream = await storage.FileRead('', 'test.txt')
                const chunks = []
                for await (const chunk of stream) {
                    chunks.push(chunk)
                }
                expect(Buffer.concat(chunks).toString()).toBe("test content")
            })

            it("should throw error if file doesn't exist", async () => {
                // Create a mock file client with custom behavior
                const mockFileClient = {
                    exists: jest.fn().mockResolvedValueOnce(false),
                    download: jest.fn().mockRejectedValueOnce(new Error("ShareFileNotFound"))
                } as unknown as ShareFileClient

                // Spy on getDirectoryClient and getFileClient
                const mockDirectoryClient = {
                    getFileClient: jest.fn().mockReturnValue(mockFileClient)
                } as unknown as ShareDirectoryClient

                // Replace the ShareClient with a mock that returns our mock directory
                storage._shareClient = {
                    getDirectoryClient: jest.fn().mockReturnValue(mockDirectoryClient)
                } as any

                // Now call the method and assert the error
                await expect(storage.FileRead('', 'nonexistent.txt')).rejects.toThrow(HttpErrorInternalServerError)
            })

        })

        describe("Write", () => {
            it("should create and upload file successfully", async () => {
                const content = Readable.from(Buffer.from("test content"))
                await storage.FileWrite('', 'test.txt', content)

                expect(mockFileClient.create).toHaveBeenCalled()
                expect(mockFileClient.uploadRange).toHaveBeenCalled()
            })

            it("should throw error if upload fails", async () => {
                (mockFileClient.create as jest.Mock).mockRejectedValueOnce(new HttpErrorInternalServerError())

                const content = Readable.from(Buffer.from("test content"))
                await expect(storage.FileWrite('', 'test.txt', content)).rejects.toThrow()
            })
        })

        describe("ListFiles", () => {
            it("should return DataTable with correct file information", async () => {
                (mockDirectoryClient.listFilesAndDirectories as jest.Mock).mockReturnValue({
                    [Symbol.asyncIterator]: () => {
                        let firstCall = true
                        return {
                            next: async () => {
                                if (firstCall) {
                                    firstCall = false
                                    return {
                                        done: false,
                                        value: {
                                            kind: "file",
                                            name: "file1.txt",
                                            properties: {
                                                contentLength: 100,
                                                lastModified: new Date(),
                                                creationTime: new Date()
                                            }
                                        }
                                    }
                                }
                                return { done: true, value: undefined }
                            }
                        }
                    }
                })

                const result = await storage.FolderListFiles()
                expect(result).toBeInstanceOf(DataTable)
                expect(result.Rows).toEqual([
                    {
                        name: "file1.txt",
                        size: 100,
                        type: "file",
                        mimeType: 'text/plain',
                        createdAt: expect.any(Date),
                        modifiedAt: expect.any(Date),
                        path: 'file1.txt'
                    }
                ])
            })

            it("should handle empty folder correctly", async () => {
                (mockDirectoryClient.listFilesAndDirectories as jest.Mock).mockImplementation(function* () { })

                const result = await storage.FolderListFiles()
                expect(result).toBeInstanceOf(DataTable)
                expect(result.Rows).toEqual([])
            })
        })
    })
})
