/* eslint-disable object-property-newline */
/* eslint-disable init-declarations */
/* eslint-disable generator-star-spacing */
import { Readable } from "stream"
import { HttpErrorInternalServerError } from "../../../server/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { AzureFileStorage } from "../AzureFileStorage"
import typia from "typia"
import { TConfigSource } from "../../../types/TConfig"
import { TAzureFileStorageConfig } from "../../../providers/storage/AzureFileStorage"
import { ShareServiceClient, ShareDirectoryClient, ShareFileClient } from "@azure/storage-file-share"
import * as ReadableHelperModule from "../../../lib/ReadableHelper"

jest.mock("../../../lib/ReadableHelper", () => ({
    ReadableHelper: {
        ToBuffer: jest.fn()
    }
}))

const rndParams = typia.random<TConfigSource>()

describe("AzureFileStorage", () => {
    let storage: AzureFileStorage
    let mockFileClient: Partial<ShareFileClient>
    let mockDirectoryClient: Partial<ShareDirectoryClient>

    beforeEach(async () => {
        // Reset all mocks
        jest.clearAllMocks()

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
            })
        }

        // Create new storage instance
        storage = new AzureFileStorage()

        // Set the configuration
        storage.SetConfig({
            ...rndParams,
            options: {
                "az-file-connection-string": "test-connection-string",
                "az-file-share-name": "test-share",
                "az-file-directory": "/",
                autocreate: true
            }
        } as TConfigSource)

        // Mock the ShareServiceClient
        const mockShareServiceClient = {
            getShareClient: jest.fn().mockImplementation((shareName: string) => {
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
            expect(storage.ConnectionString).toBe("test-connection-string")
            expect(storage.ShareName).toBe("test-share")
        })

        it("should set default value for directory if missing", () => {
            const invalidConfig: TConfigSource & TAzureFileStorageConfig = {
                ...rndParams,
                options: {
                    "az-file-connection-string": "test",
                    "az-file-share-name": "test"
                }
            }
            const storage = new AzureFileStorage()

            storage.SetConfig(invalidConfig)
            expect(storage.DirectoryPath).toBe("/")
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
                    "az-file-directory": "/",
                    autocreate: true
                }
            } as TConfigSource)

            newStorage.ConnectionString = undefined

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
                const exists = await storage.IsExist("test.txt")
                expect(exists).toBe(true)
            })

            it("should return false for non-existing file", async () => {
                (mockFileClient.exists as jest.Mock).mockResolvedValueOnce(false)

                const exists = await storage.IsExist("nonexistent.txt")
                expect(exists).toBe(false)
            })
        })

        describe("Read", () => {
            it("should return readable stream with correct content", async () => {
                (mockFileClient.download as jest.Mock).mockResolvedValueOnce({
                    readableStreamBody: Readable.from(Buffer.from("test content")),
                    contentLength: 11
                })

                const stream = await storage.Read("test.txt")
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
                storage.ShareClient = {
                    getDirectoryClient: jest.fn().mockReturnValue(mockDirectoryClient)
                } as any
            
                // Now call the method and assert the error
                await expect(storage.Read("nonexistent.txt")).rejects.toThrow(HttpErrorInternalServerError)
            })
            
        })

        describe("Write", () => {
            it("should create and upload file successfully", async () => {
                // Mock ToBuffer helper
                (ReadableHelperModule.ReadableHelper.ToBuffer as jest.Mock).mockResolvedValue(Buffer.from("test content"))

                const content = Readable.from(Buffer.from("test content"))
                await storage.Write("test.txt", content)

                expect(mockFileClient.create).toHaveBeenCalled()
                expect(mockFileClient.uploadRange).toHaveBeenCalled()
            })

            it("should throw error if upload fails", async () => {
                (ReadableHelperModule.ReadableHelper.ToBuffer as jest.Mock).mockResolvedValue(Buffer.from("test content"))
                ;(mockFileClient.create as jest.Mock).mockRejectedValueOnce(new HttpErrorInternalServerError())

                const content = Readable.from(Buffer.from("test content"))
                await expect(storage.Write("test.txt", content)).rejects.toThrow()
            })
        })

        describe("List", () => {
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
                                                lastModified: new Date()
                                            }
                                        }
                                    }
                                }
                                return { done: true, value: undefined }
                            }
                        }
                    }
                })

                const result = await storage.List()
                expect(result).toBeInstanceOf(DataTable)
                expect(result.Rows).toEqual([
                    {
                        name: "file1.txt",
                        size: 100,
                        type: "file"
                    }
                ])
            })

            it("should handle empty directory correctly", async () => {
                (mockDirectoryClient.listFilesAndDirectories as jest.Mock).mockImplementation(function* () {})

                const result = await storage.List()
                expect(result).toBeInstanceOf(DataTable)
                expect(result.Rows).toEqual([])
            })
        })
    })
})
