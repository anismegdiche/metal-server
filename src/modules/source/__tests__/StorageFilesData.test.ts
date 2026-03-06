/* eslint-disable security/detect-non-literal-regexp */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Mock } from "vitest"
import { DataTable } from "../../../types/DataTable"
import { Convert } from "../../../utils/Convert"
import { Cache } from "../../cache/Cache"
import { CONTENT } from "../../content/@consts"
import { ContentProvider } from "../../content/ContentProvider"
import { HttpResponse } from "../../core/HttpResponse"
import type { U_config_sources_source } from "../../core/types/U_config_sources"
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotImplemented } from "../../errors/HttpErrors"
import { STORAGE } from "../../storage/@consts"
import { StorageProvider } from "../../storage/StorageProvider"
import { DATA_PROVIDER } from "../@consts"
import { StorageFilesData } from "../providers/StorageFilesData"

vi.mock("../../cache/Cache")
vi.mock("../DataProvider")
vi.mock("../../storage/StorageProvider")
vi.mock("../../content/ContentProvider")
vi.mock("../../../utils/Mutex")
vi.mock("../../../utils/SynchronizerManager")
vi.mock("../../../utils/Convert")
vi.mock("../../core/HttpResponse")

describe("StorageFilesData", () => {
	let storageFilesData: StorageFilesData
	let mockStorageProvider: any
	let mockContentProvider: any

	beforeEach(() => {
		vi.clearAllMocks()

		// Setup mocks
		mockStorageProvider = {
			SetConfig: vi.fn(),
			Init: vi.fn(),
			Connect: vi.fn(),
			Disconnect: vi.fn(),
			FileRead: vi.fn(),
			FileWrite: vi.fn(),
			FolderListFiles: vi.fn().mockResolvedValue(new DataTable("list", [{ name: "test.json" }])),
		}

		mockContentProvider = {
			SetConfig: vi.fn(),
			InitContent: vi.fn(),
			Get: vi.fn(),
			Set: vi.fn(),
		}

		;(StorageProvider.GetProvider as Mock).mockReturnValue(mockStorageProvider)
		;(ContentProvider.GetProvider as Mock).mockReturnValue(mockContentProvider)

		;(Convert.PatternToRegex as Mock).mockImplementation((pattern: string) => new RegExp(pattern.replaceAll("*", ".*")))

		// Create instance
		storageFilesData = new StorageFilesData()
	})

	describe("constructor", () => {
		it("should initialize with default values", () => {
			expect(storageFilesData.ProviderName).toBe(DATA_PROVIDER.STORAGE)
			expect(storageFilesData.Config).toEqual({})
			expect(storageFilesData.Connection).toBeUndefined()
			expect(storageFilesData.ContentHandler).toEqual({})
			expect(storageFilesData.File).toEqual({})
			expect(storageFilesData.Lock instanceof Map).toBe(true)
		})
	})

	describe("Init", () => {
		const sourceConfig: U_config_sources_source = {
			provider: DATA_PROVIDER.STORAGE,
			options: {
				storage: STORAGE.FILESYSTEM,
				content: {
					"*.json": {
						"content-type": CONTENT.JSON,
					},
				},
			},
		} as U_config_sources_source

		it("should initialize correctly with valid config", async () => {
			await storageFilesData.Init("testSource", sourceConfig)

			expect(storageFilesData.SourceName).toBe("testSource")
			expect(storageFilesData.Config).toEqual(sourceConfig)
			expect(StorageProvider.GetProvider).toHaveBeenCalledWith(STORAGE.FILESYSTEM)
			expect(mockStorageProvider.SetConfig).toHaveBeenCalledWith(sourceConfig)
			expect(mockStorageProvider.Init).toHaveBeenCalled()
			expect(ContentProvider.GetProvider).toHaveBeenCalledWith(CONTENT.JSON)
		})

		it("should throw error when content is undefined", async () => {
			const invalidConfig: any = { options: { storage: STORAGE.FILESYSTEM } }
			await expect(storageFilesData.Init("testSource", invalidConfig)).rejects.toThrow(HttpErrorInternalServerError)
		})

		it("should throw error when connection init fails", async () => {
			;(StorageProvider.GetProvider as Mock).mockReturnValueOnce(null)
			await expect(storageFilesData.Init("testSource", sourceConfig)).rejects.toThrow(TypeError)
		})
	})

	describe("Connect", () => {
		beforeEach(() => {
			storageFilesData.Connection = mockStorageProvider
			storageFilesData.ContentHandler = { "*.json": mockContentProvider }
		})

		it("should connect successfully", async () => {
			await storageFilesData.Connect()
			expect(mockStorageProvider.Connect).toHaveBeenCalled()
		})
	})

	describe("Disconnect", () => {
		beforeEach(() => {
			storageFilesData.Connection = mockStorageProvider
			storageFilesData.ContentHandler = { "*.json": mockContentProvider }
		})

		it("should disconnect successfully", async () => {
			await storageFilesData.Disconnect()
			expect(mockStorageProvider.Disconnect).toHaveBeenCalled()
		})
	})

	describe("EscapeEntity and EscapeField", () => {
		it("should escape entity correctly", () => {
			const result = storageFilesData.EscapeEntity("test")
			expect(result).toBe('"test"')
		})

		it("should escape field correctly", () => {
			const result = storageFilesData.EscapeField("field")
			expect(result).toBe('"field"')
		})
	})

	describe("SetContentHandler", () => {
		beforeEach(() => {
			storageFilesData.ContentHandler = {
				"*.json": mockContentProvider,
				"users/*": mockContentProvider,
			}
		})

		it("should set content handler based on pattern match", () => {
			storageFilesData._setContentHandler("test.json")
			expect(storageFilesData.File["test.json"]).toBe(mockContentProvider)
		})

		it("should reuse existing content handler if already set", () => {
			storageFilesData.File["test.json"] = mockContentProvider
			storageFilesData._setContentHandler("test.json")
			expect(storageFilesData.File["test.json"]).toBe(mockContentProvider)
		})

		it("should throw error when no matching handler is found", () => {
			expect(() => storageFilesData._setContentHandler("test.xml")).toThrow(HttpErrorNotImplemented)
		})
	})

	describe("SetLock", () => {
		it("should create new mutex if not exists", () => {
			storageFilesData._setLock("test.json")
			expect(storageFilesData.Lock.has("test.json")).toBe(true)
		})

		it("should not create new mutex if already exists", () => {
			const mockMutex = { mock: true }
			storageFilesData.Lock.set("test.json", mockMutex as any)
			storageFilesData._setLock("test.json")
			expect(storageFilesData.Lock.get("test.json")).toBe(mockMutex)
		})
	})

	describe("Select", () => {
		const mockSchemaRequest = {
			schema: "testSchema",
			entity: "test.json",
		}

		beforeEach(async () => {
			storageFilesData.Connection = mockStorageProvider
			storageFilesData.ContentHandler = {
				"*.json": mockContentProvider,
			}

			// Setup mock implementations
			mockStorageProvider.FileRead.mockResolvedValue("test data")

			const mockDataTable = new DataTable()
			mockContentProvider.Get.mockResolvedValue(mockDataTable)

			storageFilesData.GetContext = vi.fn().mockReturnValue({})
			storageFilesData.Options = {
				Parse: vi.fn().mockReturnValue({}),
			} as any

			;(HttpResponse.Ok as Mock).mockReturnValue({ status: 200 })
		})

		it("should select successfully", async () => {
			const result = await storageFilesData.Select(mockSchemaRequest as any)

			expect(mockContentProvider.InitContent).toHaveBeenCalledWith("test.json", "test data")
			expect(mockContentProvider.Get).toHaveBeenCalledWith(
				{ fields: undefined, filter: undefined, sort: undefined },
				expect.anything(),
			)
			expect(HttpResponse.Ok).toHaveBeenCalledWith(
				expect.objectContaining({
					schema: "testSchema",
					entity: "test.json",
				}),
			)
			expect(result).toEqual({ status: 200 })
		})

		it("should cache results when cache option is enabled", async () => {
			storageFilesData.Options.Parse = vi.fn().mockReturnValue({ Cache: true })

			await storageFilesData.Select(mockSchemaRequest as any)

			expect(Cache.Set).toHaveBeenCalled()
		})

		it("should throw error when connection is not available", async () => {
			storageFilesData.Connection = undefined

			await expect(storageFilesData.Select(mockSchemaRequest as any)).rejects.toThrow(HttpErrorInternalServerError)
		})
	})

	describe("Insert", () => {
		const mockSchemaRequest = {
			schema: "testSchema",
			entity: "test.json",
		}

		beforeEach(() => {
			storageFilesData.Connection = mockStorageProvider
			storageFilesData.ContentHandler = {
				"*.json": mockContentProvider,
			}

			// Setup mock implementations
			mockStorageProvider.FileRead.mockResolvedValue("test data")
			mockStorageProvider.FileWrite.mockResolvedValue(undefined)

			const mockDataTable = new DataTable("test.json")
			// mockDataTable.FreeSql = vi.fn().mockResolvedValue(undefined)
			mockContentProvider.Get.mockResolvedValue(mockDataTable)
			mockContentProvider.Set.mockResolvedValue("updated data")

			storageFilesData.GetContext = vi.fn().mockReturnValue({})
			storageFilesData.Options = {
				Parse: vi.fn().mockReturnValue({ Data: new DataTable("test.json", [{ data: "test data" }]) }),
			} as any

			;(HttpResponse.Created as Mock).mockReturnValue({ status: 201 })
		})

		it("should insert successfully", async () => {
			const result = await storageFilesData.Insert(mockSchemaRequest as any)

			expect(mockContentProvider.InitContent).toHaveBeenCalledWith("test.json", "test data")
			expect(mockContentProvider.Get).toHaveBeenCalled()
			expect(mockContentProvider.Set).toHaveBeenCalled()
			expect(mockStorageProvider.FileWrite).toHaveBeenCalledWith(expect.any(String), "test.json", "updated data")
			expect(Cache.Remove).toHaveBeenCalled()
			expect(HttpResponse.Created).toHaveBeenCalled()
			expect(result).toEqual({ status: 201 })
		})

		it("should throw error when connection is not available", async () => {
			storageFilesData.Connection = undefined

			await expect(storageFilesData.Insert(mockSchemaRequest as any)).rejects.toThrow(HttpErrorInternalServerError)
		})

		it("should throw error when data is missing", async () => {
			storageFilesData.Options.Parse = vi.fn().mockReturnValue({})

			await expect(storageFilesData.Insert(mockSchemaRequest as any)).rejects.toThrow(HttpErrorBadRequest)
		})
	})

	describe("Update", () => {
		const mockSchemaRequest = {
			schema: "testSchema",
			entity: "test.json",
		}

		beforeEach(() => {
			storageFilesData.Connection = mockStorageProvider
			storageFilesData.ContentHandler = {
				"*.json": mockContentProvider,
			}

			// Setup mock implementations
			mockStorageProvider.FileRead.mockResolvedValue("test data")
			mockStorageProvider.FileWrite.mockResolvedValue(undefined)

			const mockDataTable = new DataTable("test.json")
			// mockDataTable.FreeSql = vi.fn().mockResolvedValue(undefined)
			mockContentProvider.Get.mockResolvedValue(mockDataTable)
			mockContentProvider.Set.mockResolvedValue("updated data")

			storageFilesData.GetContext = vi.fn().mockReturnValue({})
			storageFilesData.Options = {
				Parse: vi.fn().mockReturnValue({ Data: new DataTable("test", [{ data: "test data" }]) }),
			} as any

			;(HttpResponse.NoContent as Mock).mockReturnValue({ status: 204 })
		})

		it("should update successfully", async () => {
			const result = await storageFilesData.Update(mockSchemaRequest as any)

			expect(mockContentProvider.InitContent).toHaveBeenCalledWith("test.json", "test data")
			expect(mockContentProvider.Get).toHaveBeenCalled()
			expect(mockContentProvider.Set).toHaveBeenCalled()
			expect(mockStorageProvider.FileWrite).toHaveBeenCalledWith(expect.any(String), "test.json", "updated data")
			expect(Cache.Remove).toHaveBeenCalled()
			expect(HttpResponse.NoContent).toHaveBeenCalled()
			expect(result).toEqual({ status: 204 })
		})

		it("should throw error when data is missing", async () => {
			storageFilesData.Options.Parse = vi.fn().mockReturnValue({})

			await expect(storageFilesData.Update(mockSchemaRequest as any)).rejects.toThrow(HttpErrorBadRequest)
		})
	})

	describe("Delete", () => {
		const mockSchemaRequest = {
			schema: "testSchema",
			entity: "test.json",
		}

		beforeEach(() => {
			storageFilesData.Connection = mockStorageProvider
			storageFilesData.ContentHandler = {
				"*.json": mockContentProvider,
			}

			// Setup mock implementations
			mockStorageProvider.FileRead.mockResolvedValue("test data")
			mockStorageProvider.FileWrite.mockResolvedValue(undefined)

			const mockDataTable = new DataTable("test.json")
			// mockDataTable.FreeSql = vi.fn().mockResolvedValue(undefined)
			mockContentProvider.Get.mockResolvedValue(mockDataTable)
			mockContentProvider.Set.mockResolvedValue("updated data")

			storageFilesData.GetContext = vi.fn().mockReturnValue({})
			storageFilesData.Options = {
				Parse: vi.fn().mockReturnValue({}),
			} as any

			;(HttpResponse.NoContent as Mock).mockReturnValue({ status: 204 })
		})

		it("should delete successfully", async () => {
			const result = await storageFilesData.Delete(mockSchemaRequest as any)

			expect(mockContentProvider.InitContent).toHaveBeenCalledWith("test.json", "test data")
			expect(mockContentProvider.Get).toHaveBeenCalled()
			expect(mockContentProvider.Set).toHaveBeenCalled()
			expect(mockStorageProvider.FileWrite).toHaveBeenCalledWith(expect.any(String), "test.json", "updated data")
			expect(Cache.Remove).toHaveBeenCalled()
			expect(HttpResponse.NoContent).toHaveBeenCalled()
			expect(result).toEqual({ status: 204 })
		})
	})

	describe("AddEntity", () => {
		it("should throw not implemented error", async () => {
			await expect(storageFilesData.AddEntity({} as any)).rejects.toThrow(HttpErrorNotImplemented)
		})
	})

	describe("ListEntities", () => {
		const mockSchemaRequest = {
			schema: "testSchema",
		}

		beforeEach(() => {
			storageFilesData.Connection = mockStorageProvider
			storageFilesData.ContentHandler = {
				"*.json": mockContentProvider,
				"users/*": mockContentProvider,
			}

			// Setup mock implementations
			const mockFiles = [{ name: "test.json" }, { name: "users/user1" }, { name: "ignore.txt" }]

			// Create a mock DataTable with filter method
			const mockDataTable = new DataTable(undefined, mockFiles)

			mockStorageProvider.FolderListFiles.mockResolvedValue(mockDataTable)

			;(HttpResponse.Ok as Mock).mockReturnValue({ status: 200 })
		})

		it("should list entities successfully", async () => {
			const result = await storageFilesData.ListEntities(mockSchemaRequest as any)

			expect(mockStorageProvider.FolderListFiles).toHaveBeenCalled()
			expect(result).toEqual({ status: 200 })
		})

		it("should filter entities based on content handler patterns", async () => {
			await storageFilesData.ListEntities(mockSchemaRequest as any)

			// Verify that the data was filtered
			const dataArg = (HttpResponse.Ok as Mock).mock.calls[0]?.[0]
			const filteredRows = await dataArg.data.Rows()

			// Should only include files matching the content handler patterns (*.json and users/*)
			expect(filteredRows).toHaveLength(2)
			expect(filteredRows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ name: "test.json" }),
					expect.objectContaining({ name: "users/user1" }),
				]),
			)
			expect(filteredRows).not.toContainEqual(expect.objectContaining({ name: "ignore.txt" }))
		})

		it("should throw error when connection is not available", async () => {
			storageFilesData.Connection = undefined

			await expect(storageFilesData.ListEntities(mockSchemaRequest as any)).rejects.toThrow(HttpErrorInternalServerError)
		})
	})
})
