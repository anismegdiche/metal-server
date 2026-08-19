//
/** biome-ignore-all lint/suspicious/noNonNullAssertedOptionalChain: <explanation> */
/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
import { DataBase } from "../../../types/DataBase"
import { DataTable } from "../../../types/DataTable"
import { Cache } from "../../cache/Cache"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import type { U__sources_source } from "../../core/types/U__sources"
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import type {
	TSchemaRequestDelete,
	TSchemaRequestInsert,
	TSchemaRequestListEntities,
	TSchemaRequestSelect,
	TSchemaRequestUpdate,
} from "../../schema/types/TSchemaRequest"
import { DATA_PROVIDER } from "../@consts"
import { MemoryData } from "../providers/MemoryData"

describe("MemoryData", () => {
	// Initializing with valid source and config creates a properly configured instance
	it("should initialize with valid source and config", async () => {
		const memoryData = new MemoryData()
		const source = "test-source"
		const sourceConfig: U__sources_source = {
			provider: DATA_PROVIDER.MEMORY,
			options: { autocreate: true },
		}

		await memoryData.Init(source, sourceConfig)

		expect(memoryData.SourceName).toBe(source)
		expect(memoryData.Config.options).toEqual(sourceConfig.options)
		expect(memoryData.ProviderName).toBe(DATA_PROVIDER.MEMORY)
	})

	// Connecting to memory database creates a new DataBase instance
	it("should create a new DataBase instance when connecting", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})

		await memoryData.Connect()

		expect(memoryData.Connection).toBeInstanceOf(DataBase)
		expect(memoryData.SourceName).toBe("test-source")
		expect(memoryData.Connection?.Name).toBe("test-db")
	})

	// Connecting to memory database creates a new DataBase instance
	it("should create a new DataBase instance have sourcename when name not given", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})

		await memoryData.Connect()

		expect(memoryData.SourceName).toBe("test-source")
		expect(memoryData.Connection?.Name).toBe("test-source")
	})

	// Select operation with valid entity returns data in expected format
	it("should return data in expected format when selecting from valid entity", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		await memoryData.Connect()

		const testEntity = "test-table"
		const testRows = [
			{
				id: 1,
				name: "test",
			},
		]
		memoryData.Connection?.AddTable(testEntity, testRows)

		const schemaRequest: TSchemaRequestSelect = {
			schema: "test-schema",
			entity: testEntity,
		}

		const response = await memoryData.Select(schemaRequest)

		const resultRows = await response.Body?.data.Rows()

		expect(response.StatusCode).toBe(HTTP_STATUS_CODE.OK)
		expect(response.Body?.schema).toBe(schemaRequest.schema)
		expect(response.Body?.entity).toBe(schemaRequest.entity)
		expect(resultRows).toEqual(testRows)
	})

	// Select with limit/offset returns the page plus a provider-side pagination total
	it("should return pagination meta with total when selecting with limit", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		await memoryData.Connect()

		const testEntity = "test-table"
		const testRows = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `test${i + 1}` }))
		memoryData.Connection?.AddTable(testEntity, testRows)

		const schemaRequest: TSchemaRequestSelect = {
			schema: "test-schema",
			entity: testEntity,
			limit: 3,
			offset: 2,
		}

		const response = await memoryData.Select(schemaRequest)

		const resultRows = await response.Body?.data.Rows()
		const pagination = response.Body?.data.MetaData.__pagination__

		expect(response.StatusCode).toBe(HTTP_STATUS_CODE.OK)
		expect(resultRows).toEqual(testRows.slice(2, 5))
		expect(pagination).toEqual({ total: 10, limit: 3, offset: 2, hasMore: true })
	})

	// Select with limit beyond the dataset has no more pages
	it("should mark hasMore false when the page reaches the end", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		await memoryData.Connect()

		const testEntity = "test-table"
		const testRows = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, name: `test${i + 1}` }))
		memoryData.Connection?.AddTable(testEntity, testRows)

		const schemaRequest: TSchemaRequestSelect = {
			schema: "test-schema",
			entity: testEntity,
			limit: 3,
			offset: 2,
		}

		const response = await memoryData.Select(schemaRequest)

		const resultRows = await response.Body?.data.Rows()
		const pagination = response.Body?.data.MetaData.__pagination__

		expect(resultRows).toEqual(testRows.slice(2))
		expect(pagination).toEqual({ total: 4, limit: 3, offset: 2, hasMore: false })
	})

	// Insert operation adds rows to an existing entity
	it("should add rows to an existing entity when inserting", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
			options: { autocreate: true },
		})
		await memoryData.Connect()

		const testEntity = "test-table"
		memoryData.Connection?.AddTable(testEntity)

		const testRows = [
			{
				id: 1,
				name: "test",
			},
		]

		const schemaRequest: TSchemaRequestInsert = {
			schema: "test-schema",
			entity: testEntity,
			data: testRows,
		}

		Cache.Remove = vi.fn(async () => { })

		const response = await memoryData.Insert(schemaRequest)
		const resultRows = await memoryData.Connection?.Tables[testEntity]?.Rows()

		expect(response.StatusCode).toBe(HTTP_STATUS_CODE.CREATED)
		expect(resultRows).toEqual(testRows)
		expect(Cache.Remove).toHaveBeenCalledWith(schemaRequest)
	})

	// Update operation modifies rows based on filter criteria
	it("should modify rows based on filter criteria when updating", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		await memoryData.Connect()

		const testEntity = "testTable"
		const initialRows = [
			{
				id: 1,
				name: "test1",
			},
			{
				id: 2,
				name: "test2",
			},
		]
		memoryData.Connection?.AddTable(testEntity, initialRows)

		const updatedRows = [
			{
				id: 1,
				name: "updated",
			},
		]

		const schemaRequest: TSchemaRequestUpdate = {
			schema: "test-schema",
			entity: testEntity,
			filter: { id: 1 },
			data: updatedRows,
		}

		vi.spyOn(Cache, "Remove").mockImplementation(async () => { })
		vi.spyOn(memoryData.Connection?.Tables[testEntity]!, "FreeSql").mockResolvedValue(
			new DataTable(testEntity, [
				{
					id: 1,
					name: "updated",
				},
				{
					id: 2,
					name: "test2",
				},
			]),
		)

		const response = await memoryData.Update(schemaRequest)

		expect(response.StatusCode).toBe(HTTP_STATUS_CODE.NO_CONTENT)
		expect(Cache.Remove).toHaveBeenCalledWith(schemaRequest)
	})

	// Delete operation removes rows based on filter criteria
	it("should remove rows based on filter criteria when deleting", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		await memoryData.Connect()

		const testEntity = "testTable"
		const initialRows = [
			{
				id: 1,
				name: "test1",
			},
			{
				id: 2,
				name: "test2",
			},
		]
		memoryData.Connection?.AddTable(testEntity, initialRows)

		const schemaRequest: TSchemaRequestDelete = {
			schema: "test-schema",
			entity: testEntity,
			filter: { id: 1 },
		}

		vi.spyOn(Cache, "Remove").mockImplementation(async () => { })
		vi.spyOn(memoryData.Connection?.Tables[testEntity]!, "FreeSql").mockResolvedValue(
			new DataTable(testEntity, [
				{
					id: 2,
					name: "test2",
				},
			]),
		)

		const response = await memoryData.Delete(schemaRequest)

		expect(response.StatusCode).toBe(HTTP_STATUS_CODE.NO_CONTENT)
		expect(Cache.Remove).toHaveBeenCalledWith(schemaRequest)
	})

	// Attempting operations when not connected throws HttpErrorInternalServerError
	it("should throw HttpErrorInternalServerError when not connected", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		// Not calling Connect()

		const schemaRequest: TSchemaRequestSelect = {
			schema: "test-schema",
			entity: "testTable",
		}

		await expect(memoryData.Select(schemaRequest)).rejects.toThrow(HttpErrorInternalServerError)
		await expect(memoryData.Insert(schemaRequest as TSchemaRequestInsert)).rejects.toThrow(HttpErrorInternalServerError)
		await expect(memoryData.Update(schemaRequest as TSchemaRequestUpdate)).rejects.toThrow(HttpErrorInternalServerError)
		await expect(memoryData.Delete(schemaRequest as TSchemaRequestDelete)).rejects.toThrow(HttpErrorInternalServerError)
		await expect(memoryData.ListEntities(schemaRequest as TSchemaRequestListEntities)).rejects.toThrow(
			HttpErrorInternalServerError,
		)
	})

	// Selecting from non-existent entity throws HttpErrorNotFound
	it("should throw HttpErrorNotFound when selecting from non-existent entity", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		await memoryData.Connect()

		const schemaRequest: TSchemaRequestSelect = {
			schema: "test-schema",
			entity: "nonExistentTable",
		}

		await expect(memoryData.Select(schemaRequest)).rejects.toThrow(HttpErrorNotFound)
	})

	// Inserting without data throws HttpErrorBadRequest
	it("should throw HttpErrorBadRequest when inserting without data", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
			options: { autocreate: true },
		})
		await memoryData.Connect()

		const testEntity = "testTable"
		memoryData.Connection?.AddTable(testEntity)

		const schemaRequest: any = {
			schema: "test-schema",
			entity: testEntity,
			// No data provided
		}

		// No typia mock needed
		await expect(memoryData.Insert(schemaRequest)).rejects.toThrow(HttpErrorBadRequest)
	})

	// Updating without data throws HttpErrorBadRequest
	it("should throw HttpErrorBadRequest when updating without data", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		await memoryData.Connect()

		const testEntity = "testTable"
		memoryData.Connection?.AddTable(testEntity)

		const schemaRequest: any = {
			schema: "test-schema",
			entity: testEntity,
			filter: { id: 1 },
			// No data provided
		}

		// No typia mock needed
		await expect(memoryData.Update(schemaRequest)).rejects.toThrow(HttpErrorBadRequest)
	})

	// Attempting operations on non-existent entity throws HttpErrorNotFound
	it("should throw HttpErrorNotFound when operating on non-existent entity", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		await memoryData.Connect()

		const nonExistentEntity = "nonExistentTable"

		const updateRequest: TSchemaRequestUpdate = {
			schema: "test-schema",
			entity: nonExistentEntity,
			data: [
				{
					id: 1,
					name: "test",
				},
			],
		}

		const deleteRequest: TSchemaRequestDelete = {
			schema: "test-schema",
			entity: nonExistentEntity,
			filter: { id: 1 },
		}

		await expect(memoryData.Update(updateRequest)).rejects.toThrow(HttpErrorNotFound)
		await expect(memoryData.Delete(deleteRequest)).rejects.toThrow(HttpErrorNotFound)
	})

	// Listing entities when none exist throws HttpErrorNotFound
	it("should throw HttpErrorNotFound when listing entities and none exist", async () => {
		const memoryData = new MemoryData()
		await memoryData.Init("test-source", {
			provider: DATA_PROVIDER.MEMORY,
		})
		await memoryData.Connect()

		// Connection exists but no tables added

		const schemaRequest = <TSchemaRequestListEntities>{
			schema: "test-schema",
		}

		await expect(memoryData.ListEntities(schemaRequest)).rejects.toThrow(HttpErrorNotFound)
	})
})
