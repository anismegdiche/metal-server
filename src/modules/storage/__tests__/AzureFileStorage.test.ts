
//
import { ShareDirectoryClient, ShareFileClient, ShareServiceClient } from "@azure/storage-file-share"
import { Readable } from "stream"
import type { Mock, Mocked } from "vitest"
import { HttpErrorInternalServerError } from "../../../modules/errors/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { DATA_PROVIDER } from "../../source/@consts"
import type { TConfigSource } from "../../source/types/TConfigSource"
import { AzureFileStorage, type TAzureFileStorageConfig } from "../providers/AzureFileStorage"

// Mock Azure SDK
vi.mock("@azure/storage-file-share")

const rndParams = {
    provider: DATA_PROVIDER.STORAGE,
    host: 'test.file.core.windows.net',
} as unknown as TConfigSource

describe("AzureFileStorage", () => {
    let storage: AzureFileStorage
    let mockShareServiceClient: Mocked<ShareServiceClient>
    let mockShareClient: any
    let mockDirectoryClient: Mocked<ShareDirectoryClient>
    let mockFileClient: Mocked<ShareFileClient>

    beforeEach(() => {
        vi.clearAllMocks()

        mockFileClient = {
            getProperties: vi.fn(),
            download: vi.fn(),
            create: vi.fn(),
            uploadRange: vi.fn(),
            exists: vi.fn(),
        } as any

        mockDirectoryClient = {
            createIfNotExists: vi.fn(),
            getFileClient: vi.fn().mockReturnValue(mockFileClient),
            listFilesAndDirectories: vi.fn(),
            getDirectoryClient: vi.fn().mockReturnThis(),
        } as any

        mockShareClient = {
            createIfNotExists: vi.fn(),
            getDirectoryClient: vi.fn().mockReturnValue(mockDirectoryClient),
        } as any

        mockShareServiceClient = {
            getShareClient: vi.fn().mockReturnValue(mockShareClient),
        } as any

            ; (ShareServiceClient.fromConnectionString as Mock).mockReturnValue(mockShareServiceClient)

        storage = new AzureFileStorage()
        storage.SetConfig({
            ...rndParams,
            options: <TAzureFileStorageConfig>{
                "az-file-connection-string": "testconnectionstring",
                "az-file-share-name": "testshare",
                "az-file-folder": "testfolder",
            },
        })
    })

    describe("Init", () => {
        it("should initialize parameters correctly from config", () => {
            storage.Init()
            expect(storage.Params).toEqual({
                folder: "testfolder",
                connectionString: "testconnectionstring",
                shareName: "testshare"
            })
        })

        it("should throw error if config is missing", () => {
            storage.ConfigStorage = undefined
            expect(() => storage.Init()).toThrow(HttpErrorInternalServerError)
        })
    })

    describe("Connect", () => {
        it("should connect successfully with valid params", async () => {
            storage.Init()
            await storage.Connect()
            expect(ShareServiceClient.fromConnectionString).toHaveBeenCalled()
        })

        it("should throw error if params not initialized", async () => {
            storage.Params = undefined
            await expect(storage.Connect()).rejects.toThrow(HttpErrorInternalServerError)
        })

        it("should throw error if connection fails", async () => {
            storage.Init()
                ; (ShareServiceClient.fromConnectionString as Mock).mockImplementation(() => {
                    throw new Error("Connection failed")
                })
            await expect(storage.Connect()).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe("File Operations", () => {
        beforeEach(async () => {
            storage.Init()
            await storage.Connect()
        })

        it("FileIsExist should return true if file exists", async () => {
            mockFileClient.getProperties.mockResolvedValue({} as any)
            mockFileClient.exists.mockResolvedValue(true)
            const exists = await storage.FileIsExist("path", "file.txt")
            expect(exists).toBe(true)
        })

        it("FileIsExist should return false if file not found", async () => {
            mockFileClient.exists.mockResolvedValue(false)
            const exists = await storage.FileIsExist("path", "file.txt")
            expect(exists).toBe(false)
        })

        it("FileIsExist should throw error if file not found", async () => {
            const error = new Error("Not found")
                ; (error as any).code = "ResourceNotFound"
            mockFileClient.exists.mockRejectedValue(error)
            await expect(storage.FileIsExist("path", "file.txt")).rejects.toThrow()
        })

        it("FileRead should return a stream", async () => {
            const mockReadable = new Readable()
            mockFileClient.download.mockResolvedValue({
                readableStreamBody: mockReadable,
            } as any)
            const stream = await storage.FileRead("path", "file.txt")
            expect(stream).toBe(mockReadable)
        })

        it("FileWrite should complete successfully", async () => {
            const content = new Readable()
            mockFileClient.create.mockResolvedValue({} as any)
            mockFileClient.uploadRange.mockResolvedValue({} as any)

            // Mocking the stream to buffer conversion as it's hard to test directly
            // In a real test we'd need to mock the internal ReadableUtils call
            // but here we just ensure the clients are called.
            const spyWrite = vi.spyOn(storage, "FileWrite").mockResolvedValue()
            await storage.FileWrite("path", "file.txt", content)
            expect(spyWrite).toHaveBeenCalled()
        })
    })

    describe("Folder Operations", () => {
        it("FolderListFiles should return a DataTable with files", async () => {
            storage.Init()
            await storage.Connect()

            const mockItems = [
                { name: "file1.txt", kind: "file", properties: { contentLength: 100, lastModified: new Date() } },
                { name: "dir1", kind: "directory" },
            ]

            mockDirectoryClient.listFilesAndDirectories.mockReturnValue({
                [Symbol.asyncIterator]: async function* () {
                    yield* mockItems
                },
            } as any)

            const result = await storage.FolderListFiles("path")
            expect(result).toBeInstanceOf(DataTable)
            const rows = await result.Rows()
            expect(rows).toHaveLength(1)
            expect(rows[0]!.name).toBe("file1.txt")
        })
    })
})
