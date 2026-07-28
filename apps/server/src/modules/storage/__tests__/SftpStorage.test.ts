//
import { PassThrough, Readable } from "node:stream"
import type SftpClient from "ssh2-sftp-client"
import type { Mocked } from "vitest"
import type { U__sources_source } from "../../core/types/U__sources"
import { DATA_PROVIDER } from "../../source/@consts"
import { STORAGE_TYPE } from "../@consts"
import { SftpStorage } from "../providers/SftpStorage"
import type { U__storage_sftp } from "../types/U__storage_sftp"

// Mock SFTP Client
vi.mock("ssh2-sftp-client")

const rndParams = {
	provider: DATA_PROVIDER.STORAGE,
}

describe("SftpStorage", () => {
	let storage: SftpStorage
	let mockSftpClient: Mocked<SftpClient>

	beforeEach(() => {
		vi.clearAllMocks()

		mockSftpClient = {
			connect: vi.fn(),
			end: vi.fn(),
			exists: vi.fn(),
			mkdir: vi.fn(),
			list: vi.fn(),
			get: vi.fn(),
			put: vi.fn(),
			rename: vi.fn(),
			delete: vi.fn(),
			cwd: vi.fn(),
			createWriteStream: vi.fn(),
			createReadStream: vi.fn(),
		} as any

		storage = new SftpStorage()
		storage._sftpClient = mockSftpClient

		storage.SetConfig({
			...rndParams,
			options: {
				"storage-type": STORAGE_TYPE.SFTP,
				host: "test.sftp.server.com",
				port: 22,
				user: "testuser",
				password: "testpassword",
				folder: "/uploads",
			},
		} as any)
	})

	describe("Init", () => {
		it("should initialize the storage client with given options", async () => {
			storage.Init()
			const config = storage.StorageConfig as unknown as U__storage_sftp
			expect(config?.host).toBe("test.sftp.server.com")
			expect(config?.port).toBe(22)
			expect(config?.user).toBe("testuser")
			expect(config?.password).toBe("testpassword")
			expect(config?.folder).toBe("/uploads")
		})

		it("should use default port if not provided", async () => {
			storage.SetConfig({
				...rndParams,
				options: {
					"storage-type": STORAGE_TYPE.SFTP,
					host: "test.sftp.server.com",
					user: "testuser",
					password: "testpassword",
				},
			} as any)
			storage.Init()
			expect((storage.StorageConfig as unknown as U__storage_sftp)?.port).toBe(22)
		})

		it("should use default folder if not provided", async () => {
			const freshStorage = new SftpStorage()
			freshStorage.SetConfig({
				...rndParams,
				options: {
					"storage-type": STORAGE_TYPE.SFTP,
					host: "test.sftp.server.com",
					user: "testuser",
					password: "testpassword",
				},
			} as any)
			freshStorage.Init()
			expect((freshStorage.StorageConfig as unknown as U__storage_sftp)?.folder).toBe("/")
		})
	})

	describe("Connect", () => {
		it("should connect successfully with valid configuration", async () => {
			storage.Init()
			await storage.Connect()

			expect(mockSftpClient.connect).toHaveBeenCalledWith({
				host: "test.sftp.server.com",
				port: 22,
				user: "testuser",
				password: "testpassword",
			})
		})

		it("should connect with private key if provided", async () => {
			storage.SetConfig({
				...rndParams,
				options: {
					"storage-type": STORAGE_TYPE.SFTP,
					host: "test.sftp.server.com",
					user: "testuser",
					password: "testpassword",
					"private-key": "-----BEGIN RSA PRIVATE KEY-----\n...",
					passphrase: "testpassphrase",
				},
			} as any)
			storage.Init()
			await storage.Connect()

			expect(mockSftpClient.connect).toHaveBeenCalledWith({
				host: "test.sftp.server.com",
				port: 22,
				user: "testuser",
				password: "testpassword",
				privateKey: "-----BEGIN RSA PRIVATE KEY-----\n...",
				passphrase: "testpassphrase",
			})
		})

		it("should throw error if connection fails", async () => {
			mockSftpClient.connect = vi.fn().mockRejectedValue(new Error("Connection failed"))

			storage.Init()
			await expect(async () => await storage.Connect()).rejects.toThrow()
		})
	})

	describe("FolderIsExist", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should return true if folder exists", async () => {
			mockSftpClient.stat = vi.fn().mockResolvedValue({})

			const result = await storage.FolderIsExist("test-folder")
			expect(result).toBe(true)
			expect(mockSftpClient.stat).toHaveBeenCalledWith("/uploads/test-folder")
		})

		it("should return false if folder does not exist", async () => {
			mockSftpClient.stat = vi.fn().mockRejectedValue(new Error("File not found"))

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
			mockSftpClient.mkdir = vi.fn()

			await storage.FolderCreate("test-folder")

			expect(mockSftpClient.mkdir).toHaveBeenCalledWith("/uploads/test-folder", true)
		})
	})

	describe("FolderListFolders", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should list folders successfully", async () => {
			const mockFolders = [
				{ type: "d", name: "folder1" },
				{ type: "d", name: "folder2" },
				{ type: "-", name: "file1.txt" },
			]
			mockSftpClient.list = vi.fn().mockResolvedValue(mockFolders)

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
				{ type: "-", name: "file1.txt", size: 100, modifyTime: new Date() },
				{ type: "-", name: "file2.txt", size: 200, modifyTime: new Date() },
				{ type: "d", name: "folder1" },
			]
			mockSftpClient.list = vi.fn().mockResolvedValue(mockFiles)

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
			mockSftpClient.stat = vi.fn().mockResolvedValue({})

			const result = await storage.FileIsExist("test-folder", "test-file.txt")
			expect(result).toBe(true)
			expect(mockSftpClient.stat).toHaveBeenCalledWith("/uploads/test-folder/test-file.txt")
		})

		it("should return false if file does not exist", async () => {
			mockSftpClient.stat = vi.fn().mockRejectedValue(new Error("File not found"))

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
			const mockStream = Readable.from(["test data"])
			mockSftpClient.stat = vi.fn().mockResolvedValue({}) // File exists
			mockSftpClient.createReadStream = vi.fn().mockReturnValue(mockStream)

			const result = await storage.FileRead("test-folder", "test-file.txt")

			expect(result).toBeDefined()
			expect(mockSftpClient.createReadStream).toHaveBeenCalledWith("/uploads/test-folder/test-file.txt")
		})

		it("should throw error if file does not exist", async () => {
			mockSftpClient.stat = vi.fn().mockRejectedValue(new Error("File not found"))

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
			const mockWriteStream = new PassThrough()
			mockSftpClient.createWriteStream = vi.fn().mockReturnValue(mockWriteStream)

			await storage.FileWrite("test-folder", "test-file.txt", mockStream)

			expect(mockSftpClient.createWriteStream).toHaveBeenCalledWith("/uploads/test-folder/test-file.txt")
		})
	})

	describe("FileRename", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should rename file successfully", async () => {
			mockSftpClient.stat = vi.fn().mockResolvedValue({}) // File exists
			mockSftpClient.rename = vi.fn()

			await storage.FileRename("test-folder", "old-file.txt", "new-file.txt")

			expect(mockSftpClient.rename).toHaveBeenCalledWith(
				"/uploads/test-folder/old-file.txt",
				"/uploads/test-folder/new-file.txt",
			)
		})
	})

	describe("FileDelete", () => {
		beforeEach(async () => {
			storage.Init()
			await storage.Connect()
		})

		it("should delete file successfully", async () => {
			mockSftpClient.delete = vi.fn()

			await storage.FileDelete("test-folder", "test-file.txt")

			expect(mockSftpClient.delete).toHaveBeenCalledWith("/uploads/test-folder/test-file.txt")
		})
	})

	describe("Disconnect", () => {
		it("should disconnect successfully", async () => {
			storage.Init()
			await storage.Connect()

			await storage.Disconnect()

			expect(mockSftpClient.end).toHaveBeenCalled()
		})
	})
})
