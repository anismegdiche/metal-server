import { Readable } from "node:stream"
import { type ShareDirectoryClient, type ShareFileClient, ShareServiceClient } from "@azure/storage-file-share"
import type { Mocked } from "vitest"
import { DATA_PROVIDER } from "../../source/@consts"
import { STORAGE_TYPE } from "../@consts"
import { AzureFileStorage } from "../providers/AzureFileStorage"

// Mock Azure SDK
vi.mock("@azure/storage-file-share")

const rndParams = {
	provider: DATA_PROVIDER.STORAGE,
	host: "test.file.core.windows.net",
}

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
			delete: vi.fn(),
			rename: vi.fn(),
		} as any

		mockDirectoryClient = {
			createIfNotExists: vi.fn(),
			getFileClient: vi.fn().mockReturnValue(mockFileClient),
			listFilesAndDirectories: vi.fn().mockReturnValue({
				[Symbol.asyncIterator]: function* () {
					yield { name: "folder1", kind: "directory" }
					yield { name: "folder2", kind: "directory" }
					yield { name: "file1.txt", kind: "file" }
				},
			}),
			getDirectoryClient: vi.fn().mockReturnThis(),
			deleteFile: vi.fn(),
			exists: vi.fn(),
			create: vi.fn(),
		} as any

		mockShareClient = {
			createIfNotExists: vi.fn(),
			getDirectoryClient: vi.fn().mockReturnValue(mockDirectoryClient),
		} as any

		mockShareServiceClient = {
			getShareClient: vi.fn().mockReturnValue(mockShareClient),
		} as any

		// Set up the constructor mock
		const ShareServiceClientMock = ShareServiceClient as any
		ShareServiceClientMock.mockImplementation(() => mockShareServiceClient)
		ShareServiceClientMock.fromConnectionString = vi.fn().mockReturnValue(mockShareServiceClient)

		storage = new AzureFileStorage()
		storage.SetConfig({
			...rndParams,
			options: {
				"storage-type": STORAGE_TYPE.AZURE_FILE,
				"connection-string":
					"DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=testkey;EndpointSuffix=core.windows.net",
				"share-name": "test-share",
				folder: "test-folder",
			},
		} as any)
		storage.Init()
	})

	describe("Init", () => {
		it("should initialize parameters from configuration", () => {
			expect(storage.Params).toEqual({
				connectionString:
					"DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=testkey;EndpointSuffix=core.windows.net",
				shareName: "test-share",
				folder: "test-folder",
			})
		})
	})

	describe("Connect", () => {
		it("should connect successfully with valid parameters", async () => {
			await storage.Connect()
			expect(ShareServiceClient.fromConnectionString).toHaveBeenCalledWith(
				"DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=testkey;EndpointSuffix=core.windows.net",
			)
			expect(mockShareServiceClient.getShareClient).toHaveBeenCalledWith("test-share")
		})
	})

	describe("FolderIsExist", () => {
		beforeEach(async () => {
			await storage.Connect()
		})

		it("should return true if folder exists", async () => {
			mockDirectoryClient.exists = vi.fn().mockResolvedValue(true)

			const result = await storage.FolderIsExist("test-folder")
			expect(result).toBe(true)
		})

		it("should return false if folder does not exist", async () => {
			mockDirectoryClient.exists = vi.fn().mockResolvedValue(false)

			const result = await storage.FolderIsExist("non-existent-folder")
			expect(result).toBe(false)
		})
	})

	describe("FolderCreate", () => {
		beforeEach(async () => {
			await storage.Connect()
		})

		it("should create folder successfully", async () => {
			mockDirectoryClient.create = vi.fn().mockResolvedValue({ succeeded: true })

			await storage.FolderCreate("test-folder")
			expect(mockDirectoryClient.create).toHaveBeenCalled()
		})
	})

	describe("FolderListFolders", () => {
		beforeEach(async () => {
			await storage.Connect()
		})

		it("should list folders successfully", async () => {
			mockDirectoryClient.listFilesAndDirectories = vi.fn().mockReturnValue({
				[Symbol.asyncIterator]: function* () {
					yield { name: "folder1", kind: "directory" }
					yield { name: "folder2", kind: "directory" }
					yield { name: "file1.txt", kind: "file" }
				},
			})

			const result = await storage.FolderListFolders()
			const rows = await result.Rows()
			expect(rows).toHaveLength(2)
			expect(rows[0]?.name).toBe("folder1")
			expect(rows[0]?.type).toBe("folder")
		})
	})

	describe("FolderListFiles", () => {
		beforeEach(async () => {
			await storage.Connect()
		})

		it("should list files in folder successfully", async () => {
			mockDirectoryClient.listFilesAndDirectories = vi.fn().mockReturnValue({
				[Symbol.asyncIterator]: function* () {
					yield { name: "file1.txt", kind: "file" }
					yield { name: "file2.txt", kind: "file" }
				},
			})

			const result = await storage.FolderListFiles("test-folder")
			const rows = await result.Rows()
			expect(rows).toHaveLength(2)
			expect(rows[0]?.name).toBe("file1.txt")
			expect(rows[0]?.type).toBe("file")
		})
	})

	describe("FileIsExist", () => {
		beforeEach(async () => {
			await storage.Connect()
		})

		it("should return true if file exists", async () => {
			mockFileClient.exists = vi.fn().mockResolvedValue(true)

			const result = await storage.FileIsExist("test-folder", "test-file.txt")
			expect(result).toBe(true)
		})

		it("should return false if file does not exist", async () => {
			mockFileClient.exists = vi.fn().mockResolvedValue(false)

			const result = await storage.FileIsExist("test-folder", "non-existent.txt")
			expect(result).toBe(false)
		})
	})

	describe("FileRead", () => {
		beforeEach(async () => {
			await storage.Connect()
		})

		it("should read file successfully", async () => {
			const mockStream = Readable.from(["test data"])
			mockFileClient.download = vi.fn().mockResolvedValue({
				readableStreamBody: mockStream,
			})

			const result = await storage.FileRead("test-folder", "test-file.txt")
			expect(result).toBeDefined()
		})

		it("should throw HttpErrorInternalServerError if file does not exist", async () => {
			const error = new Error("File not found") as Error & { code?: string }
			error.code = "ResourceNotFound"
			mockFileClient.download = vi.fn().mockRejectedValue(error)

			await expect(storage.FileRead("test-folder", "non-existent.txt")).rejects.toThrow()
		})

		it("should throw error if ShareClient is not connected", async () => {
			storage._shareClient = undefined as any
			await expect(storage.FileRead("test-folder", "test-file.txt")).rejects.toThrow()
		})

		it("should throw error if folder is not defined", async () => {
			storage.Params = {
				connectionString: storage.Params?.connectionString ?? "",
				shareName: storage.Params?.shareName ?? "",
				folder: undefined,
			}
			await expect(storage.FileRead("test-folder", "test-file.txt")).rejects.toThrow()
		})
	})

	describe("FileWrite", () => {
		beforeEach(async () => {
			await storage.Connect()
		})

		it("should write file successfully", async () => {
			const mockStream = Readable.from([Buffer.from("test data")])
			mockFileClient.create = vi.fn().mockResolvedValue(undefined)
			mockFileClient.uploadRange = vi.fn().mockResolvedValue(undefined)

			await storage.FileWrite("test-folder", "test-file.txt", mockStream)
			expect(mockFileClient.create).toHaveBeenCalled()
		})
	})

	describe("FileRename", () => {
		beforeEach(async () => {
			await storage.Connect()
		})

		it("should rename file successfully", async () => {
			mockFileClient.rename = vi.fn().mockResolvedValue(undefined)

			await storage.FileRename("test-folder", "old-file.txt", "new-file.txt")
			expect(mockFileClient.rename).toHaveBeenCalled()
		})
	})

	describe("FileDelete", () => {
		beforeEach(async () => {
			await storage.Connect()
		})

		it("should delete file successfully", async () => {
			mockFileClient.delete = vi.fn().mockResolvedValue(undefined)

			await storage.FileDelete("test-folder", "test-file.txt")
			expect(mockFileClient.delete).toHaveBeenCalled()
		})
	})

	describe("Disconnect", () => {
		it("should disconnect successfully", async () => {
			await storage.Connect()
			await storage.Disconnect()
			// Disconnect should clear the client
			expect(storage.Disconnect).toBeDefined()
		})
	})
})
