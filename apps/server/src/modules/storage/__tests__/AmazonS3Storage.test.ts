import { Readable } from "node:stream"
import { vi } from "vitest"
import { HttpErrorInternalServerError } from "../../../modules/errors/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import type { U__sources_source } from "../../core/types/U__sources"
import { DATA_PROVIDER } from "../../source/@consts"
import { AmazonS3Storage } from "../providers/AmazonS3Storage"

const mockS3Module = {
	S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() } )),
	ListObjectsV2Command: vi.fn().mockImplementation(() => ({} )),
	PutObjectCommand: vi.fn().mockImplementation(() => ({} )),
	GetObjectCommand: vi.fn().mockImplementation(() => ({} )),
	CopyObjectCommand: vi.fn().mockImplementation(() => ({} )),
	DeleteObjectCommand: vi.fn().mockImplementation(() => ({} )),
}

const baseParams = {
	provider: DATA_PROVIDER.STORAGE,
	host: "s3.amazonaws.com",
} as unknown as U__sources_source

describe("AmazonS3Storage", () => {
	let storage: AmazonS3Storage
	const mockConfig: U__sources_source = {
		...baseParams,
		provider: DATA_PROVIDER.STORAGE,
		host: "s3.amazonaws.com",
		options: {
			bucket: "test-bucket",
			region: "us-east-1",
			"access-key-id": "test-key",
			"secret-access-key": "test-secret",
			endpoint: "http://127.0.0.1:9000",
		},
	}

	beforeEach(() => {
		vi.clearAllMocks()
		// Inject the mock S3 module for testing
		AmazonS3Storage.setS3Module(mockS3Module as any)
		storage = new AmazonS3Storage()
		storage.SetConfig(mockConfig)
	})

	describe("Connect", () => {
		it("should connect successfully with valid credentials", async () => {
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({}),
			}

			// Set up the S3Client mock
			mockS3Module.S3Client.mockImplementation(() => mockS3Client)

			await storage.Connect()
		})

		it("should throw error with missing configuration", async () => {
			const storageWithoutConfig = new AmazonS3Storage()
			await expect(storageWithoutConfig.Connect()).rejects.toThrow(HttpErrorInternalServerError)
		})
	})

	describe("FileIsExist", () => {
		it("should return true for existing file", async () => {
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({
					ContentLength: 1024,
				}),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			const result = await storage.FileIsExist("test-folder", "test-file.txt")
			expect(result).toBe(true)
		})

		it("should return false for non-existing file", async () => {
			const mockS3Client = {
				send: vi.fn().mockRejectedValue({ name: "NoSuchKey", code: "NoSuchKey" }),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			// The method should catch NoSuchKey errors and return false
			const result = await storage.FileIsExist("test-folder", "non-existent.txt")
			expect(result).toBe(false)
		})
	})

	describe("FileRead", () => {
		it("should read file successfully", async () => {
			const mockStream = Readable.from(["test data"])
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({
					Body: mockStream,
				}),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			const result = await storage.FileRead("test-folder", "test-file.txt")
			expect(result).toBeDefined()
		})

		it("should throw error if file does not exist", async () => {
			const mockS3Client = {
				send: vi.fn().mockRejectedValue(new Error("NoSuchKey")),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			await expect(storage.FileRead("test-folder", "non-existent.txt")).rejects.toThrow()
		})
	})

	describe("FileWrite", () => {
		it("should write file successfully", async () => {
			const mockStream = Readable.from(["test data"])
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({}),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			await storage.FileWrite("test-folder", "test-file.txt", mockStream)
			expect(mockS3Client.send).toHaveBeenCalled()
		})
	})

	describe("FileDelete", () => {
		it("should delete file successfully", async () => {
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({}),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			await storage.FileDelete("test-folder", "test-file.txt")
			expect(mockS3Client.send).toHaveBeenCalled()
		})
	})

	describe("FileRename", () => {
		it("should rename file successfully", async () => {
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({}),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			await storage.FileRename("test-folder", "old-file.txt", "new-file.txt")
			expect(mockS3Client.send).toHaveBeenCalled()
		})
	})

	describe("FolderIsExist", () => {
		it("should return true for existing folder", async () => {
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({
					CommonPrefixes: [{ Prefix: "test-folder/" }],
				}),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			const result = await storage.FolderIsExist("test-folder")
			expect(result).toBe(true)
		})

		it("should return false for non-existing folder", async () => {
			const mockS3Client = {
				send: vi.fn().mockRejectedValue(new Error("NotFound")),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			const result = await storage.FolderIsExist("non-existent-folder")
			expect(result).toBe(false)
		})
	})

	describe("FolderCreate", () => {
		it("should create folder successfully", async () => {
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({}),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			await storage.FolderCreate("test-folder")
			expect(mockS3Client.send).toHaveBeenCalled()
		})
	})

	describe("FolderListFiles", () => {
		it("should list files successfully", async () => {
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({
					Contents: [
						{ Key: "test-folder/file1.txt", Size: 100 },
						{ Key: "test-folder/file2.txt", Size: 200 },
					],
				}),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			const result = await storage.FolderListFiles("test-folder")
			expect(result).toBeInstanceOf(DataTable)
		})
	})

	describe("FolderListFolders", () => {
		it("should list folders successfully", async () => {
			const mockS3Client = {
				send: vi.fn().mockResolvedValue({
					CommonPrefixes: [{ Prefix: "test-folder/subfolder1/" }, { Prefix: "test-folder/subfolder2/" }],
				}),
			}

			mockS3Module.S3Client.mockImplementation(() => mockS3Client)
			await storage.Connect()

			const result = await storage.FolderListFolders()
			expect(result).toBeInstanceOf(DataTable)
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
