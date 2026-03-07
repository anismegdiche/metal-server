import { Readable } from "node:stream"
import { vi } from "vitest"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../../modules/errors/HttpErrors"
import type { U__sources_source } from "../../core/types/U__sources"
import { DATA_PROVIDER } from "../../source/@consts"
import { FtpStorage } from "../providers/FtpStorage"

// Mock the module
vi.mock("basic-ftp")
vi.mock("../../../utils/Convert")

const rndParams = {
	provider: DATA_PROVIDER.STORAGE,
	host: "127.0.0.1",
} as unknown as U__sources_source

describe("FtpStorage", () => {
	let ftpStorage: FtpStorage
	let mockClient: any

	beforeEach(() => {
		vi.clearAllMocks()

		// Create mock client
		mockClient = {
			access: vi.fn().mockResolvedValue(undefined),
			close: vi.fn(),
			ensureDir: vi.fn().mockResolvedValue(undefined),
			list: vi.fn().mockResolvedValue([]),
			size: vi.fn().mockResolvedValue(1024),
			downloadTo: vi.fn().mockResolvedValue(undefined),
			uploadFrom: vi.fn().mockResolvedValue(undefined),
			appendFrom: vi.fn().mockResolvedValue(undefined),
			rename: vi.fn().mockResolvedValue(undefined),
			remove: vi.fn().mockResolvedValue(undefined),
		}

		ftpStorage = new FtpStorage()
		ftpStorage._ftpClient = mockClient
		ftpStorage.SetConfig({
			...rndParams,
			options: {
				host: "127.0.0.1",
				user: "user",
				password: "password", // NOSONAR
			},
		})
		ftpStorage.Params = {
			host: "127.0.0.1",
			port: 21,
			user: "user",
			password: "password", // NOSONAR
			secure: false,
		}
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	describe("Init", () => {
		it("should initialize the FTP client with given options", async () => {
			ftpStorage.Init()
			expect(ftpStorage.Config?.host).toBe("127.0.0.1")
		})
	})

	describe("Connect", () => {
		it("should connect to the FTP server", async () => {
			ftpStorage.Init()
			mockClient.access.mockResolvedValue(undefined)

			await ftpStorage.Connect()
			expect(mockClient.access).toHaveBeenCalledWith({
				host: "127.0.0.1",
				port: 21,
				user: "user",
				password: "password", // NOSONAR
				secure: false,
			})
		})

		it("should throw HttpErrorInternalServerError on connection failure", async () => {
			mockClient.access.mockRejectedValue(new Error("Connection failed"))
			ftpStorage.Init()

			await expect(ftpStorage.Connect()).rejects.toThrow(HttpErrorInternalServerError)
		})
	})

	describe("FolderIsExist", () => {
		beforeEach(async () => {
			ftpStorage.Init()
			await ftpStorage.Connect()
		})

		it("should return true if folder exists", async () => {
			mockClient.list.mockResolvedValue([
				{ name: "test-folder", isDirectory: true },
				{ name: "file1.txt", isDirectory: false },
			])

			const result = await ftpStorage.FolderIsExist("test-folder")
			expect(result).toBe(true)
		})

		it("should return false if folder does not exist", async () => {
			mockClient.list.mockResolvedValue([{ name: "file1.txt", isDirectory: false }])

			const result = await ftpStorage.FolderIsExist("non-existent-folder")
			expect(result).toBe(false)
		})
	})

	describe("FolderCreate", () => {
		beforeEach(async () => {
			ftpStorage.Init()
			await ftpStorage.Connect()
		})

		it("should create folder successfully", async () => {
			mockClient.ensureDir.mockResolvedValue(undefined)

			await ftpStorage.FolderCreate("test-folder")
			expect(mockClient.ensureDir).toHaveBeenCalledWith("/test-folder")
		})
	})

	describe("FolderListFolders", () => {
		beforeEach(async () => {
			ftpStorage.Init()
			await ftpStorage.Connect()
		})

		it("should list folders successfully", async () => {
			mockClient.list.mockResolvedValue([
				{ name: "folder1", isDirectory: true },
				{ name: "folder2", isDirectory: true },
				{ name: "file1.txt", isDirectory: false },
			])

			const result = await ftpStorage.FolderListFolders()
			const rows = await result.Rows()
			expect(rows).toHaveLength(2)
			expect(rows[0]?.name).toBe("folder1")
			expect(rows[0]?.type).toBe("folder")
		})
	})

	describe("FolderListFiles", () => {
		beforeEach(async () => {
			ftpStorage.Init()
			await ftpStorage.Connect()
		})

		it("should list files in folder successfully", async () => {
			mockClient.list.mockResolvedValue([
				{ name: "file1.txt", size: 100, isDirectory: false },
				{ name: "file2.txt", size: 200, isDirectory: false },
			])

			const result = await ftpStorage.FolderListFiles("test-folder")
			const rows = await result.Rows()
			expect(rows).toHaveLength(2)
			expect(rows[0]?.name).toBe("file1.txt")
			expect(rows[0]?.type).toBe("file")
		})
	})

	describe("FileIsExist", () => {
		beforeEach(async () => {
			ftpStorage.Init()
			await ftpStorage.Connect()
		})

		it("should return true if file exists", async () => {
			mockClient.size.mockResolvedValue(1024)

			const result = await ftpStorage.FileIsExist("test-folder", "test-file.txt")
			expect(result).toBe(true)
		})

		it("should return false if file does not exist", async () => {
			mockClient.size.mockRejectedValue(new Error("File not found"))

			const result = await ftpStorage.FileIsExist("test-folder", "non-existent.txt")
			expect(result).toBe(false)
		})
	})

	describe("FileRead", () => {
		beforeEach(async () => {
			ftpStorage.Init()
			await ftpStorage.Connect()
		})

		it("should return a readable stream of the file content", async () => {
			const mockStream = Readable.from(["test data"])
			mockClient.size.mockResolvedValue(1024) // File exists
			mockClient.downloadTo.mockResolvedValue(mockStream)

			const result = await ftpStorage.FileRead("test-folder", "test-file.txt")
			expect(result).toBeDefined()
		})

		it("should throw HttpErrorNotFound if file does not exist", async () => {
			mockClient.size.mockRejectedValue(new Error("File not found"))

			await expect(ftpStorage.FileRead("test-folder", "non-existent.txt")).rejects.toThrow(HttpErrorNotFound)
		})
	})

	describe("FileWrite", () => {
		beforeEach(async () => {
			ftpStorage.Init()
			await ftpStorage.Connect()
		})

		it("should write file successfully", async () => {
			const mockStream = Readable.from(["test data"])
			mockClient.size.mockResolvedValue(1024) // File exists for append
			mockClient.appendFrom.mockResolvedValue(undefined)

			await ftpStorage.FileWrite("test-folder", "test-file.txt", mockStream)
			expect(mockClient.appendFrom).toHaveBeenCalledWith(mockStream, "/test-folder/test-file.txt")
		})
	})

	describe("FileRename", () => {
		beforeEach(async () => {
			ftpStorage.Init()
			await ftpStorage.Connect()
		})

		it("should rename file successfully", async () => {
			mockClient.size.mockResolvedValue(1024) // File exists
			mockClient.rename.mockResolvedValue(undefined)

			await ftpStorage.FileRename("test-folder", "old-file.txt", "new-file.txt")
			expect(mockClient.rename).toHaveBeenCalledWith("/test-folder/old-file.txt", "/test-folder/new-file.txt")
		})
	})

	describe("FileDelete", () => {
		beforeEach(async () => {
			ftpStorage.Init()
			await ftpStorage.Connect()
		})

		it("should delete file successfully", async () => {
			mockClient.size.mockResolvedValue(1024) // File exists
			mockClient.remove.mockResolvedValue(undefined)

			await ftpStorage.FileDelete("test-folder", "test-file.txt")
			expect(mockClient.remove).toHaveBeenCalledWith("/test-folder/test-file.txt")
		})
	})

	describe("Disconnect", () => {
		it("should close the FTP client connection", async () => {
			await ftpStorage.Connect()
			await ftpStorage.Disconnect()
			expect(mockClient.close).toHaveBeenCalled()
		})
	})
})
