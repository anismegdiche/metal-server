/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable init-declarations */
import { FilesData } from "../FilesData"
import { Logger } from "../../../utils/Logger"
import { Cache } from "../../../server/Cache"
import { DATA_PROVIDER } from "../../DataProvider"
import { STORAGE, StorageProvider } from "../../StorageProvider"
import { CONTENT, ContentProvider } from "../../ContentProvider"
import { DataTable } from "../../../types/DataTable"
import { HttpResponse } from "../../../server/HttpResponse"
import { HttpErrorNotImplemented, HttpErrorInternalServerError, HttpErrorBadRequest } from "../../../server/HttpErrors"
import { Convert } from "../../../lib/Convert"
import { TConfigSource } from "../../../types/TConfig"

// Mocks
jest.mock("../../../utils/Logger")
jest.mock("../../../server/Cache")
jest.mock("../../../providers/DataProvider")
jest.mock("../../StorageProvider")
jest.mock("../../ContentProvider")
jest.mock("../../../utils/Mutex")
jest.mock("../../../utils/SynchronizerManager")
jest.mock("../../../lib/Convert")
jest.mock("../../../server/HttpResponse")

describe("FilesData", () => {
    let filesData: FilesData
    let mockStorageProvider: any
    let mockContentProvider: any

    beforeEach(() => {
        jest.clearAllMocks()

        // Setup mocks
        mockStorageProvider = {
            SetConfig: jest.fn(),
            Init: jest.fn(),
            Connect: jest.fn(),
            Disconnect: jest.fn(),
            Read: jest.fn(),
            Write: jest.fn(),
            List: jest.fn()
        }

        mockContentProvider = {
            SetConfig: jest.fn(),
            InitContent: jest.fn(),
            Get: jest.fn(),
            Set: jest.fn()
        };

        (StorageProvider.GetProvider as jest.Mock).mockReturnValue(mockStorageProvider);
        (ContentProvider.GetProvider as jest.Mock).mockReturnValue(mockContentProvider);

        // (Convert.PatternToRegex as jest.Mock).mockImplementation((pattern) => new RegExp(pattern))

        // Create instance
        filesData = new FilesData()
    })

    describe("constructor", () => {
        it("should initialize with default values", () => {
            expect(filesData.ProviderName).toBe(DATA_PROVIDER.FILES)
            expect(filesData.Config).toEqual({})
            expect(filesData.Connection).toBeUndefined()
            expect(filesData.ContentHandler).toEqual({})
            expect(filesData.File).toEqual({})
            expect(filesData.Lock instanceof Map).toBe(true)
        })
    })

    describe("Init", () => {
        const sourceConfig: TConfigSource = {
            provider: DATA_PROVIDER?.FILES,
            options: {
                storage: STORAGE.FILESYSTEM,
                content: {
                    "*.json": {
                        type: CONTENT.JSON
                    }
                }
            }
        }

        it("should initialize correctly with valid config", async () => {
            await filesData.Init("testSource", sourceConfig)

            expect(filesData.SourceName).toBe("testSource")
            expect(filesData.Config).toBe(sourceConfig)
            expect(StorageProvider.GetProvider).toHaveBeenCalledWith(STORAGE.FILESYSTEM)
            expect(mockStorageProvider.SetConfig).toHaveBeenCalledWith(sourceConfig)
            expect(mockStorageProvider.Init).toHaveBeenCalled()
            expect(ContentProvider.GetProvider).toHaveBeenCalledWith(CONTENT.JSON)
        })

        it("should throw error when content is undefined", async () => {
            const invalidConfig = { options: { storage: STORAGE.FILESYSTEM } }
            await expect(filesData.Init("testSource", invalidConfig as any)).rejects.toThrow(HttpErrorNotImplemented)
        })

        it("should throw error when connection init fails", async () => {
            (StorageProvider.GetProvider as jest.Mock).mockReturnValue(null)
            await expect(filesData.Init("testSource", sourceConfig)).rejects.toThrow(TypeError)
        })
    })

    describe("Connect", () => {
        beforeEach(async () => {
            filesData.Connection = mockStorageProvider
            filesData.ContentHandler = { "*.json": mockContentProvider }
        })

        it("should connect successfully", async () => {
            await filesData.Connect()
            expect(mockStorageProvider.Connect).toHaveBeenCalled()
        })

        it("should handle connection errors gracefully", async () => {
            const errorSpy = jest.spyOn(Logger, "Error")
            mockStorageProvider.Connect.mockImplementation(() => {
                throw new Error("Connection failed")
            })

            await filesData.Connect()
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to connect in storage provider"))
        })
    })

    describe("Disconnect", () => {
        beforeEach(() => {
            filesData.Connection = mockStorageProvider
            filesData.ContentHandler = { "*.json": mockContentProvider }
        })

        it("should disconnect successfully", async () => {
            await filesData.Disconnect()
            expect(mockStorageProvider.Disconnect).toHaveBeenCalled()
        })

        it("should handle disconnection errors gracefully", async () => {
            const errorSpy = jest.spyOn(Logger, "Error")
            mockStorageProvider.Disconnect.mockImplementation(() => {
                throw new Error("Disconnection failed")
            })

            await filesData.Disconnect()
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to disconnect in storage provider"))
        })
    })

    describe("EscapeEntity and EscapeField", () => {
        it("should escape entity correctly", () => {
            expect(filesData.EscapeEntity("test")).toBe("`test`")
        })

        it("should escape field correctly", () => {
            expect(filesData.EscapeField("field")).toBe("`field`")
        })
    })

    describe("SetContentHandler", () => {
        beforeEach(() => {
            filesData.ContentHandler = {
                "*.json": mockContentProvider,
                "users/*": mockContentProvider
            }
        })

        it("should set content handler based on pattern match", () => {
            filesData.SetContentHandler("test.json")
            expect(filesData.File["test.json"]).toBe(mockContentProvider)
        })

        it("should reuse existing content handler if already set", () => {
            filesData.File["test.json"] = mockContentProvider
            filesData.SetContentHandler("test.json")
            expect(filesData.File["test.json"]).toBe(mockContentProvider)
        })

        it("should throw error when no matching handler is found", () => {
            expect(() => filesData.SetContentHandler("test.xml")).toThrow(HttpErrorNotImplemented)
        })
    })

    describe("SetLock", () => {
        it("should create new mutex if not exists", () => {
            filesData.SetLock("test.json")
            expect(filesData.Lock.has("test.json")).toBe(true)
        })

        it("should not create new mutex if already exists", () => {
            const mockMutex = { mock: true }
            filesData.Lock.set("test.json", mockMutex as any)
            filesData.SetLock("test.json")
            expect(filesData.Lock.get("test.json")).toBe(mockMutex)
        })
    })

    describe("Select", () => {
        const mockSchemaRequest = {
            schema: "testSchema",
            entity: "test.json"
        }

        beforeEach(async () => {
            filesData.Connection = mockStorageProvider
            filesData.ContentHandler = {
                "*.json": mockContentProvider
            }

            // Setup mock implementations
            mockStorageProvider.Read.mockResolvedValue("test data")

            const mockDataTable = new DataTable()
            mockContentProvider.Get.mockResolvedValue(mockDataTable)

            filesData.GenerateSqlSelect = jest.fn().mockReturnValue({ Query: () => "SELECT * FROM test" })
            filesData.GetSqlQuery = jest.fn().mockReturnValue("SELECT * FROM test")
            filesData.GetContext = jest.fn().mockReturnValue({})
            filesData.Options = {
                Parse: jest.fn().mockReturnValue({})
            } as any;

            (HttpResponse.Ok as jest.Mock).mockReturnValue({ status: 200 })
        })

        it("should select successfully", async () => {
            const result = await filesData.Select(mockSchemaRequest as any)

            expect(filesData.GenerateSqlSelect).toHaveBeenCalled()
            expect(filesData.GetSqlQuery).toHaveBeenCalled()
            expect(mockContentProvider.InitContent).toHaveBeenCalledWith("test.json", "test data")
            expect(mockContentProvider.Get).toHaveBeenCalledWith("SELECT * FROM test", expect.anything())
            expect(HttpResponse.Ok).toHaveBeenCalledWith(expect.objectContaining({
                schema: "testSchema",
                entity: "test.json"
            }))
            expect(result).toEqual({ status: 200 })
        })

        it("should cache results when cache option is enabled", async () => {
            filesData.Options.Parse = jest.fn().mockReturnValue({ Cache: true })

            await filesData.Select(mockSchemaRequest as any)

            expect(Cache.Set).toHaveBeenCalled()
        })

        it("should throw error when connection is not available", async () => {
            filesData.Connection = undefined

            await expect(filesData.Select(mockSchemaRequest as any)).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe("Insert", () => {
        const mockSchemaRequest = {
            schema: "testSchema",
            entity: "test.json"
        }

        beforeEach(() => {
            filesData.Connection = mockStorageProvider
            filesData.ContentHandler = {
                "*.json": mockContentProvider
            }

            // Setup mock implementations
            mockStorageProvider.Read.mockResolvedValue("test data")
            mockStorageProvider.Write.mockResolvedValue(undefined)

            const mockDataTable = new DataTable()
            mockDataTable.FreeSqlAsync = jest.fn().mockResolvedValue(undefined)
            mockContentProvider.Get.mockResolvedValue(mockDataTable)
            mockContentProvider.Set.mockResolvedValue("updated data")

            filesData.GenerateSqlInsert = jest.fn().mockReturnValue({
                Query: () => "INSERT INTO test",
                Data: {}
            })
            filesData.GetContext = jest.fn().mockReturnValue({})
            filesData.Options = {
                Parse: jest.fn().mockReturnValue({ Data: new DataTable() })
            } as any;

            (HttpResponse.Created as jest.Mock).mockReturnValue({ status: 201 })
        })

        it("should insert successfully", async () => {
            const result = await filesData.Insert(mockSchemaRequest as any)

            expect(filesData.GenerateSqlInsert).toHaveBeenCalled()
            expect(mockContentProvider.InitContent).toHaveBeenCalledWith("test.json", "test data")
            expect(mockContentProvider.Get).toHaveBeenCalled()
            expect(mockContentProvider.Set).toHaveBeenCalled()
            expect(mockStorageProvider.Write).toHaveBeenCalledWith("test.json", "updated data")
            expect(Cache.Remove).toHaveBeenCalled()
            expect(HttpResponse.Created).toHaveBeenCalled()
            expect(result).toEqual({ status: 201 })
        })

        it("should throw error when connection is not available", async () => {
            filesData.Connection = undefined

            await expect(filesData.Insert(mockSchemaRequest as any)).rejects.toThrow(HttpErrorInternalServerError)
        })

        it("should throw error when data is missing", async () => {
            filesData.Options.Parse = jest.fn().mockReturnValue({})

            await expect(filesData.Insert(mockSchemaRequest as any)).rejects.toThrow(HttpErrorBadRequest)
        })
    })

    describe("Update", () => {
        const mockSchemaRequest = {
            schema: "testSchema",
            entity: "test.json"
        }

        beforeEach(() => {
            filesData.Connection = mockStorageProvider
            filesData.ContentHandler = {
                "*.json": mockContentProvider
            }

            // Setup mock implementations
            mockStorageProvider.Read.mockResolvedValue("test data")
            mockStorageProvider.Write.mockResolvedValue(undefined)

            const mockDataTable = new DataTable()
            mockDataTable.FreeSqlAsync = jest.fn().mockResolvedValue(undefined)
            mockContentProvider.Get.mockResolvedValue(mockDataTable)
            mockContentProvider.Set.mockResolvedValue("updated data")

            filesData.GenerateSqlUpdate = jest.fn().mockReturnValue({
                Query: () => "UPDATE test",
                Data: {}
            })
            filesData.GetContext = jest.fn().mockReturnValue({})
            filesData.Options = {
                Parse: jest.fn().mockReturnValue({ Data: new DataTable() })
            } as any;

            (HttpResponse.NoContent as jest.Mock).mockReturnValue({ status: 204 })
        })

        it("should update successfully", async () => {
            const result = await filesData.Update(mockSchemaRequest as any)

            expect(filesData.GenerateSqlUpdate).toHaveBeenCalled()
            expect(mockContentProvider.InitContent).toHaveBeenCalledWith("test.json", "test data")
            expect(mockContentProvider.Get).toHaveBeenCalled()
            expect(mockContentProvider.Set).toHaveBeenCalled()
            expect(mockStorageProvider.Write).toHaveBeenCalledWith("test.json", "updated data")
            expect(Cache.Remove).toHaveBeenCalled()
            expect(HttpResponse.NoContent).toHaveBeenCalled()
            expect(result).toEqual({ status: 204 })
        })

        it("should throw error when data is missing", async () => {
            filesData.Options.Parse = jest.fn().mockReturnValue({})

            await expect(filesData.Update(mockSchemaRequest as any)).rejects.toThrow(HttpErrorBadRequest)
        })
    })

    describe("Delete", () => {
        const mockSchemaRequest = {
            schema: "testSchema",
            entity: "test.json"
        }

        beforeEach(() => {
            filesData.Connection = mockStorageProvider
            filesData.ContentHandler = {
                "*.json": mockContentProvider
            }

            // Setup mock implementations
            mockStorageProvider.Read.mockResolvedValue("test data")
            mockStorageProvider.Write.mockResolvedValue(undefined)

            const mockDataTable = new DataTable()
            mockDataTable.FreeSqlAsync = jest.fn().mockResolvedValue(undefined)
            mockContentProvider.Get.mockResolvedValue(mockDataTable)
            mockContentProvider.Set.mockResolvedValue("updated data")

            filesData.GenerateSqlDelete = jest.fn().mockReturnValue({
                Query: () => "DELETE FROM test",
                Data: {}
            })
            filesData.GetContext = jest.fn().mockReturnValue({})
            filesData.Options = {
                Parse: jest.fn().mockReturnValue({})
            } as any;

            (HttpResponse.NoContent as jest.Mock).mockReturnValue({ status: 204 })
        })

        it("should delete successfully", async () => {
            const result = await filesData.Delete(mockSchemaRequest as any)

            expect(filesData.GenerateSqlDelete).toHaveBeenCalled()
            expect(mockContentProvider.InitContent).toHaveBeenCalledWith("test.json", "test data")
            expect(mockContentProvider.Get).toHaveBeenCalled()
            expect(mockContentProvider.Set).toHaveBeenCalled()
            expect(mockStorageProvider.Write).toHaveBeenCalledWith("test.json", "updated data")
            expect(Cache.Remove).toHaveBeenCalled()
            expect(HttpResponse.NoContent).toHaveBeenCalled()
            expect(result).toEqual({ status: 204 })
        })
    })

    describe("AddEntity", () => {
        it("should throw not implemented error", async () => {
            await expect(filesData.AddEntity({} as any)).rejects.toThrow(HttpErrorNotImplemented)
        })
    })

    describe("ListEntities", () => {
        const mockSchemaRequest = {
            schema: "testSchema"
        }

        beforeEach(() => {
            filesData.Connection = mockStorageProvider
            filesData.ContentHandler = {
                "*.json": mockContentProvider,
                "users/*": mockContentProvider
            }

            // Setup mock implementations
            const mockDataTable = new DataTable()
            mockDataTable.Rows = [
                { name: "test.json" },
                { name: "users/user1" },
                { name: "ignore.txt" }
            ]
            mockStorageProvider.List.mockResolvedValue(mockDataTable);

            (HttpResponse.Ok as jest.Mock).mockReturnValue({ status: 200 })
        })

        it("should list entities successfully", async () => {
            const result = await filesData.ListEntities(mockSchemaRequest as any)

            expect(mockStorageProvider.List).toHaveBeenCalled()
            expect(HttpResponse.Ok).toHaveBeenCalledWith(expect.objectContaining({
                schema: "testSchema"
            }))
            expect(result).toEqual({ status: 200 })
        })

        it("should filter entities based on content handler patterns", async () => {
            await filesData.ListEntities(mockSchemaRequest as any)

            // Verify that the data was filtered
            const dataArg = (HttpResponse.Ok as jest.Mock).mock.calls[0][0]
            expect(dataArg.data.Rows.length).toBeLessThan(3) // Should have filtered out ignore.txt
        })

        it("should throw error when connection is not available", async () => {
            filesData.Connection = undefined

            await expect(filesData.ListEntities(mockSchemaRequest as any)).rejects.toThrow(HttpErrorInternalServerError)
        })
    })
})