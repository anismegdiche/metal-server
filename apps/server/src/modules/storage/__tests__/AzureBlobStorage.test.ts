//

import { Readable } from "node:stream"
import { BlobServiceClient, type BlockBlobClient, type ContainerClient } from "@azure/storage-blob"
import type { Mock, Mocked } from "vitest"
import type { U__sources_source } from "../../core/types/U__sources"
import { DATA_PROVIDER } from "../../source/@consts"
import type { U__source_storage } from "../../source/types/U__source_storage"
import { AzureBlobStorage } from "../providers/AzureBlobStorage"
import type { U__storage_azblob } from "../types/U__storage_azblob"

// Mock Azure SDK
vi.mock("@azure/storage-blob")

const rndParams = {
	provider: DATA_PROVIDER.STORAGE,
	host: "test.blob.core.windows.net",
}

describe("AzureBlobStorage", () => {
	let storage: AzureBlobStorage
	let mockBlobServiceClient: Mocked<BlobServiceClient>
	let mockContainerClient: Mocked<ContainerClient>
	let mockBlockBlobClient: Mocked<BlockBlobClient>

	beforeEach(() => {
		vi.clearAllMocks()

		mockBlockBlobClient = {
			getProperties: vi.fn(),
			download: vi.fn(),
			uploadData: vi.fn(),
			uploadStream: vi.fn(),
			exists: vi.fn(),
			delete: vi.fn(),
			beginCopyFromURL: vi.fn(),
			url: "https://test.blob.core.windows.net/test-container/test-blob",
		} as any

		mockContainerClient = {
			getBlockBlobClient: vi.fn().mockReturnValue(mockBlockBlobClient),
			createIfNotExists: vi.fn(),
			listBlobsByHierarchy: vi.fn(),
			listBlobsFlat: vi.fn(),
			getBlobClient: vi.fn().mockReturnValue(mockBlockBlobClient),
		} as any

		mockBlobServiceClient = {
			getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
		} as any

		;(BlobServiceClient.fromConnectionString as Mock).mockReturnValue(mockBlobServiceClient)

		storage = new AzureBlobStorage()
		storage.SetConfig({
			...rndParams,
			options: {
				"connection-string": "testconnectionstring",
				container: "testcontainer",
				autocreate: true,
			},
		} as any)
	})

	describe("Init", () => {
		it("should initialize the storage client with given options", async () => {
			storage.Init()
			const config = storage.SourceConfig as U__source_storage
			expect((config.options as U__storage_azblob)?.["connection-string"]).toBe("testconnectionstring")
			expect((config.options as U__storage_azblob)?.container).toBe("testcontainer")
			expect(config.options?.autocreate).toBe(true)
		})

		it("should use default autocreate value if not provided", async () => {
			const freshStorage = new AzureBlobStorage()
			freshStorage.SetConfig({
				...rndParams,
				options: {
					"connection-string": "testconnectionstring",
					container: "testcontainer",
				},
			} as any)
			freshStorage.Init()
			expect(freshStorage?.SourceConfig?.options?.autocreate).toBe(false)
		})
	})

	describe("Connect", () => {
		it("should connect successfully with valid configuration", async () => {
			storage.Init()
			await storage.Connect()

			expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith("testconnectionstring")
			expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith("testcontainer")
			expect(storage._containerClient).toBe(mockContainerClient)
		})

		it("should create container if autocreate is enabled", async () => {
			storage.Init()
			await storage.Connect()

			expect(mockContainerClient.createIfNotExists).toHaveBeenCalled()
		})

		it("should throw error if connection string is missing", async () => {
			storage.Params = {
				connectionString: "",
				container: "testcontainer",
				autocreate: false,
			}

			const promise = storage.Connect()
			await expect(promise).rejects.toThrow()
		})

		it("should throw error if container name is missing", async () => {
			storage.Params = {
				connectionString: "testconnectionstring",
				container: "",
				autocreate: false,
			}

			const promise = storage.Connect()
			await expect(promise).rejects.toThrow()
		})
	})

	describe("FolderIsExist", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should return true if folder exists", async () => {
			mockContainerClient.listBlobsByHierarchy = vi.fn().mockReturnValue([
				{
					name: "test-folder/",
					kind: "prefix",
				},
			])

			const result = await storage.FolderIsExist("test-folder")
			expect(result).toBe(true)
		})

		it("should return false if folder does not exist", async () => {
			mockContainerClient.listBlobsByHierarchy = vi.fn().mockReturnValue([])

			const result = await storage.FolderIsExist("test-folder")
			expect(result).toBe(false)
		})
	})

	describe("FolderCreate", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should create folder successfully", async () => {
			mockContainerClient.getBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient)
			mockBlockBlobClient.uploadData = vi.fn()

			await storage.FolderCreate("test-folder")

			expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith("test-folder/")
			expect(mockBlockBlobClient.uploadData).toHaveBeenCalledWith(Buffer.alloc(0))
		})
	})

	describe("FolderListFolders", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should list folders successfully", async () => {
			const mockFolders = [
				{ name: "folder1/", kind: "prefix" },
				{ name: "folder2/", kind: "prefix" },
			]
			mockContainerClient.listBlobsByHierarchy = vi.fn().mockReturnValue(mockFolders)

			const result = await storage.FolderListFolders()
			const rows = await result.Rows()
			expect(rows).toHaveLength(2)
			expect(rows[0]?.name).toBe("folder1")
			expect(rows[0]?.type).toBe("folder")
		})
	})

	describe("FolderListFiles", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should list files in folder successfully", async () => {
			const mockFiles = [
				{
					name: "test-folder/file1.txt",
					kind: "file",
					properties: { contentLength: 100, createdOn: new Date(), lastModified: new Date() },
				},
				{
					name: "test-folder/file2.txt",
					kind: "file",
					properties: { contentLength: 200, createdOn: new Date(), lastModified: new Date() },
				},
			]
			mockContainerClient.listBlobsFlat = vi.fn().mockReturnValue(mockFiles)

			const result = await storage.FolderListFiles("test-folder")
			const rows = await result.Rows()
			expect(rows).toHaveLength(2)
			expect(rows[0]?.name).toBe("file1.txt")
			expect(rows[0]?.type).toBe("file")
			expect(rows[0]?.size).toBe(100)
		})
	})

	describe("FileIsExist", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should return true if file exists", async () => {
			mockBlockBlobClient.exists = vi.fn().mockResolvedValue(true)
			mockContainerClient.getBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient)

			const result = await storage.FileIsExist("test-folder", "test-file.txt")
			expect(result).toBe(true)
		})

		it("should return false if file does not exist", async () => {
			mockBlockBlobClient.exists = vi.fn().mockResolvedValue(false)
			mockContainerClient.getBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient)

			const result = await storage.FileIsExist("test-folder", "test-file.txt")
			expect(result).toBe(false)
		})
	})

	describe("FileRead", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should read file successfully", async () => {
			const mockBuffer = Buffer.from("test data")
			mockBlockBlobClient.downloadToBuffer = vi.fn().mockResolvedValue(mockBuffer)
			mockBlockBlobClient.exists = vi.fn().mockResolvedValue(true)
			mockContainerClient.getBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient)

			const result = await storage.FileRead("test-folder", "test-file.txt")

			expect(result).toBeDefined()
			expect(mockBlockBlobClient.exists).toHaveBeenCalled()
			expect(mockBlockBlobClient.downloadToBuffer).toHaveBeenCalled()
		})

		it("should throw error if file does not exist", async () => {
			mockBlockBlobClient.downloadToBuffer = vi.fn().mockRejectedValue(new Error("Blob not found"))
			mockContainerClient.getBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient)

			await expect(storage.FileRead("test-folder", "test-file.txt")).rejects.toThrow()
		})
	})

	describe("FileWrite", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should write file successfully", async () => {
			const mockStream = Readable.from(["test data"])
			mockBlockBlobClient.uploadStream = vi.fn()
			mockContainerClient.getBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient)

			await storage.FileWrite("test-folder", "test-file.txt", mockStream)

			expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith("test-folder/test-file.txt")
			expect(mockBlockBlobClient.uploadStream).toHaveBeenCalledWith(mockStream)
		})
	})

	describe("FileRename", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should rename file successfully", async () => {
			const mockCopyResult = { pollUntilDone: vi.fn().mockResolvedValue({}) }
			mockBlockBlobClient.beginCopyFromURL = vi.fn().mockReturnValue(mockCopyResult)
			mockContainerClient.getBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient)

			await storage.FileRename("test-folder", "old-file.txt", "new-file.txt")

			expect(mockBlockBlobClient.beginCopyFromURL).toHaveBeenCalled()
			expect(mockBlockBlobClient.delete).toHaveBeenCalled()
		})
	})

	describe("FileDelete", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should delete file successfully", async () => {
			mockBlockBlobClient.delete = vi.fn()
			mockContainerClient.getBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient)

			await storage.FileDelete("test-folder", "test-file.txt")

			expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith("test-folder/test-file.txt")
			expect(mockBlockBlobClient.delete).toHaveBeenCalled()
		})
	})

	describe("Disconnect", () => {
		it("should disconnect successfully", async () => {
			storage.Init()
			await storage.Connect()

			await storage.Disconnect()

			expect(storage._containerClient).toBeUndefined()
		})
	})
})
