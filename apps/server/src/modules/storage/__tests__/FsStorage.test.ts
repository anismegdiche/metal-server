import * as Fs from "node:fs"
import { Readable } from "node:stream"
import { type Mock, vi } from "vitest"
import { HttpErrorNotFound } from "../../../modules/errors/HttpErrors"
import type { U__sources_source } from "../../core/types/U__sources"
import { DATA_PROVIDER } from "../../source/@consts"
import { FsStorage } from "../providers/FsStorage"
import type { U__storage_fs } from "../types/U__storage_fs"

vi.mock("node:fs", async () => {
	const actual = await vi.importActual<typeof import("node:fs")>("fs")
	return {
		...actual,
		existsSync: vi.fn(),
		createReadStream: vi.fn(),
		promises: {
			...actual.promises,
			writeFile: vi.fn(),
			readdir: vi.fn(),
			mkdir: vi.fn(),
			stat: vi.fn(),
			unlink: vi.fn(),
			rename: vi.fn(),
		},
	}
})

type FsMock = typeof Fs & {
	existsSync: Mock
	createReadStream: Mock
	promises: typeof Fs.promises & {
		writeFile: Mock
		readdir: Mock
		mkdir: Mock
		stat: Mock
		unlink: Mock
		rename: Mock
	}
}

const fsMock = Fs as unknown as FsMock

describe("FsStorage", () => {
	let fsStorage: FsStorage
	const sourceConfig = {
		provider: DATA_PROVIDER.STORAGE,
		options: {
			folder: "./",
		},
	}
	vi.spyOn(process, "platform", "get").mockReturnValue("linux")

	beforeEach(() => {
		vi.clearAllMocks()
		fsMock.existsSync.mockReset()
		fsMock.createReadStream.mockReset()
		fsMock.promises.writeFile.mockReset()
		fsMock.promises.readdir.mockReset()
		fsMock.promises.mkdir.mockReset()
		fsMock.promises.stat.mockReset()
		fsMock.promises.unlink.mockReset()
		fsMock.promises.rename.mockReset()

		

		fsStorage = new FsStorage()
		fsStorage.SetConfig(sourceConfig as any)
		fsStorage.Init()
	})

	describe("Init", () => {
		it("should initialize with correct folder path", async () => {
			expect((fsStorage.SourceConfig as unknown as U__storage_fs)?.folder).toBe("./")
		})

		it("should throw if config is invalid", () => {
			const badStorage = new FsStorage()
			expect(() => badStorage.SetConfig({ provider: DATA_PROVIDER.STORAGE, options: {} } as any)).toThrow()
		})
	})

	describe("Connect", () => {
		it("should connect successfully", async () => {
			await fsStorage.Connect()
			expect(fsStorage.Connect).toBeDefined()
		})
	})

	describe("FolderIsExist", () => {
		it("should return true if folder exists", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(true)
			const result = await fsStorage.FolderIsExist("test-folder")
			expect(result).toBe(true)
		})

		it("should return false if folder does not exist", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(false)
			const result = await fsStorage.FolderIsExist("non-existent-folder")
			expect(result).toBe(false)
		})

		it("should throw if params are not defined", async () => {
			const badStorage = new FsStorage()
			badStorage.Params = undefined
			await expect(badStorage.FolderIsExist("folder")).rejects.toThrow()
		})
	})

	describe("FolderCreate", () => {
		it("should create folder successfully", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(false)
			fsMock.mkdirSync = vi.fn()
			await fsStorage.FolderCreate("test-folder")
			expect(fsMock.mkdirSync).toHaveBeenCalledWith("test-folder")
		})
		it("should not create folder if already exists", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(true)
			fsMock.mkdirSync = vi.fn()
			await fsStorage.FolderCreate("existing-folder")
			expect(fsMock.mkdirSync).not.toHaveBeenCalled()
		})
	})

	describe("FolderListFolders", () => {
		it("should list folders successfully", async () => {
			fsMock.promises.readdir = vi.fn().mockResolvedValue([
				{ name: "folder1", isDirectory: () => true },
				{ name: "folder2", isDirectory: () => true },
				{ name: "file1.txt", isDirectory: () => false },
			])
			const result = await fsStorage.FolderListFolders()
			const rows = await result.Rows()
			expect(rows).toHaveLength(2)
			expect(rows[0]?.name).toBe("folder1")
			expect(rows[0]?.type).toBe("folder")
		})
		it("should throw on error", async () => {
			fsMock.promises.readdir = vi.fn().mockRejectedValue(new Error("fail"))
			await expect(fsStorage.FolderListFolders()).rejects.toThrow()
		})
	})

	describe("FolderListFiles", () => {
		it("should list files in folder successfully", async () => {
			fsMock.promises.readdir = vi.fn().mockResolvedValue([
				{ name: "file1.txt", isDirectory: () => false, parentPath: "./test-folder" },
				{ name: "file2.txt", isDirectory: () => false, parentPath: "./test-folder" },
				{ name: "subfolder", isDirectory: () => true, parentPath: "./test-folder" },
			])
			vi.spyOn(Fs, "statSync").mockReturnValue({
				size: 123,
				birthtime: new Date(),
				mtime: new Date(),
			} as any)
			fsStorage.GetMimeType = vi.fn().mockReturnValue("text/plain")
			const result = await fsStorage.FolderListFiles("test-folder")
			const rows = await result.Rows()
			expect(rows).toHaveLength(2)
			expect(rows[0]?.name).toBe("file1.txt")
			expect(rows[0]?.type).toBe("file")
		})
		it("should throw on error", async () => {
			fsMock.promises.readdir = vi.fn().mockRejectedValue(new Error("fail"))
			await expect(fsStorage.FolderListFiles("fail")).rejects.toThrow()
		})
	})

	describe("FileIsExist", () => {
		it("should return true if file exists", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(true)
			const result = await fsStorage.FileIsExist("test-folder", "test-file.txt")
			expect(result).toBe(true)
		})

		it("should return false if file does not exist", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(false)
			const result = await fsStorage.FileIsExist("test-folder", "non-existent.txt")
			expect(result).toBe(false)
		})
	})

	describe("FileRead", () => {
		it("should read file successfully", async () => {
			const mockStream = Readable.from(["test data"])
			fsMock.existsSync = vi.fn().mockReturnValue(true)
			fsMock.createReadStream = vi.fn().mockReturnValue(mockStream)
			fsStorage.FileIsExist = vi.fn().mockResolvedValue(true)
			fsStorage.GetMimeType = vi.fn().mockReturnValue("text/plain")
			const result = await fsStorage.FileRead("test-folder", "test-file.txt")
			expect(result).toBeDefined()
		})

		it("should throw HttpErrorNotFound if file does not exist", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(false)
			fsStorage.FileIsExist = vi.fn().mockResolvedValue(false)
			await expect(fsStorage.FileRead("test-folder", "non-existent.txt")).rejects.toThrow(HttpErrorNotFound)
		})
	})

	describe("FileWrite", () => {
		it("should write file successfully", async () => {
			const mockStream = Readable.from(["test data"])
			fsMock.promises.writeFile = vi.fn().mockResolvedValue(undefined)
			fsStorage.FileIsExist = vi.fn().mockResolvedValue(true)
			await fsStorage.FileWrite("test-folder", "test-file.txt", mockStream)
			expect(fsMock.promises.writeFile).toHaveBeenCalled()
		})
		it("should autocreate file if autocreate is true and file does not exist", async () => {
			fsStorage.Params = { folder: "./", autocreate: true }
			fsStorage.FileIsExist = vi.fn().mockResolvedValue(false)
			fsMock.openSync = vi.fn().mockReturnValue(1)
			fsMock.promises.writeFile = vi.fn().mockResolvedValue(undefined)
			fsMock.closeSync = vi.fn()
			const mockStream = Readable.from(["test data"])
			await fsStorage.FileWrite("test-folder", "auto-file.txt", mockStream)
			expect(fsMock.openSync).toHaveBeenCalled()
			expect(fsMock.promises.writeFile).toHaveBeenCalled()
			expect(fsMock.closeSync).toHaveBeenCalled()
		})
	})

	describe("FileRename", () => {
		it("should rename file successfully", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(true)
			fsMock.renameSync = vi.fn()
			await fsStorage.FileRename("test-folder", "old-file.txt", "new-file.txt")
			expect(fsMock.renameSync).toHaveBeenCalledWith("test-folder/old-file.txt", "test-folder/new-file.txt")
		})
		it("should not rename if file does not exist", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(false)
			fsMock.renameSync = vi.fn()
			await fsStorage.FileRename("test-folder", "old-file.txt", "new-file.txt")
			expect(fsMock.renameSync).not.toHaveBeenCalled()
		})
	})

	describe("FileDelete", () => {
		it("should delete file successfully", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(true)
			fsMock.unlinkSync = vi.fn()
			await fsStorage.FileDelete("test-folder", "test-file.txt")
			expect(fsMock.unlinkSync).toHaveBeenCalledWith("test-folder/test-file.txt")
		})
		it("should not delete if file does not exist", async () => {
			fsMock.existsSync = vi.fn().mockReturnValue(false)
			fsMock.unlinkSync = vi.fn()
			await fsStorage.FileDelete("test-folder", "test-file.txt")
			expect(fsMock.unlinkSync).not.toHaveBeenCalled()
		})
	})

	describe("Disconnect", () => {
		it("should disconnect successfully", async () => {
			await fsStorage.Connect()
			await fsStorage.Disconnect()
			expect(fsStorage.Disconnect).toBeDefined()
		})
	})

	describe("Additional Tests", () => {
		it("should throw not found error if file does not exist and no autocreate", async () => {
			fsStorage.Params = { folder: "./", autocreate: false }
			fsStorage.FileIsExist = vi.fn().mockResolvedValue(false)
			await expect(fsStorage.FileRead("test-folder", "nonExistentFile.txt")).rejects.toThrow(HttpErrorNotFound)
		})
		it("should throw if Params is missing", async () => {
			const badStorage = new FsStorage()
			badStorage.Params = undefined
			await expect(badStorage.FileIsExist("a", "b")).rejects.toThrow()
		})
	})
})
