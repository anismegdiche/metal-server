import { DataTable, SORT_ORDER } from "../../../types/DataTable"
import type { TCacheData } from "../../cache/@types"
import type { TSchemaRequest } from "../../schema/types/TSchemaRequest"
import type { TOptionalParameter } from "../@types"
import { DataProviderOptions } from "../base/absDataProvider"

// mock related classes
vi.mock("../../source/providers/MemoryData", () => ({ MemoryData: {} }))
vi.mock("../../source/providers/WebServiceData", () => ({ WebServiceData: {} }))
vi.mock("../../source/providers/MetalData", () => ({ MetalData: {} }))
vi.mock("../../source/providers/MongoDbData", () => ({ MongoDbData: {} }))
vi.mock("../../source/providers/MySqlData", () => ({ MySqlData: {} }))
vi.mock("../../source/providers/PlanData", () => ({ PlanData: {} }))
vi.mock("../../source/providers/PostgresData", () => ({ PostgresData: {} }))
vi.mock("../../source/providers/SqlServerData", () => ({ SqlServerData: {} }))
vi.mock("../../source/providers/CosmosDbData", () => ({ CosmosDbData: {} }))
vi.mock("../../source/providers/StorageData", () => ({ StorageData: {} }))
vi.mock("../../plan/Step", () => ({ Step: {} }))

describe("DataProviderOptions", () => {
	// Parse method correctly transforms TSchemaRequest into TOptions object
	it("should transform valid TSchemaRequest into TOptions object", () => {
		const providerOptions = new DataProviderOptions()
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
			fields: "field1,field2",
			sort: { name: SORT_ORDER.ASC },
			cache: 300,
		}

		const result = providerOptions.Parse(request)

		expect(result.Fields).toEqual(["field1", "field2"])
		expect(result.Sort).toEqual({ name: SORT_ORDER.ASC })
		expect(result.Cache).toBe(300)
	})

	// GetFilter processes both filter-expression and filter fields from request
	it("should process return filter-expression if filter-expression and filter are given", () => {
		const provider = new DataProviderOptions()
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
			"filter-expression": 'name = "test"',
			filter: { id: 1 },
		}

		const result = provider.GetFilter({}, request)

		expect(result.Filter).toEqual('name = "test"')
	})

	// GetFields returns '*' when no fields specified in request
	it("should return asterisk when fields not specified", () => {
		const provider = new DataProviderOptions()
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
		}

		const result = provider.GetFields({}, request)

		expect(result.Fields).toEqual(["*"])
	})

	// GetData creates new DataTable instance from request data
	it("should create DataTable from request data", async () => {
		const provider = new DataProviderOptions()
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
			data: [
				{
					id: 1,
					name: "test",
				},
			],
		}

		const result = provider.GetData({}, request)

		expect(result.Data).toBeInstanceOf(DataTable)
		expect(await result.Data?.Count()).toBe(1)
	})

	// GetSort transfers sort parameter from request to options
	it("should transfer sort parameter to options", () => {
		const provider = new DataProviderOptions()
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
			sort: { name: SORT_ORDER.DESC },
		}

		const result = provider.GetSort({}, request)

		expect(result.Sort).toEqual({ name: SORT_ORDER.DESC })
	})

	// GetCache copies cache value from request to options when present
	it("should copy cache value to options when present", () => {
		const provider = new DataProviderOptions()
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
			cache: 600,
		}

		const result = provider.GetCache({}, request)

		expect(result.Cache).toBe(600)
	})

	// Handle empty or undefined schemaRequest in Parse method
	it("should return empty options for undefined request", () => {
		const provider = new DataProviderOptions()

		const result = provider.Parse({} as TSchemaRequest)

		expect(result).toEqual(<TOptionalParameter>{
			Fields: ["*"],
		})
	})

	// Process TCacheData arrays without evaluation in GetData
	it("should process TCacheData arrays without evaluation", () => {
		const provider = new DataProviderOptions()
		const cacheData: TCacheData[] = [
			{
				hash: "123",
				expires: 123,
				schema: "test",
				data: new DataTable("test"),
				schemaRequest: {
					schema: "test",
					entity: "entity",
				},
			},
		]
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
			data: cacheData,
		}

		const result = provider.GetData({}, request)

		expect(result.Data).toBeInstanceOf(DataTable)
	})

	// Handle undefined fields parameter in GetFields
	it("should handle undefined fields parameter", () => {
		const provider = new DataProviderOptions()
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
			fields: undefined,
		}

		const result = provider.GetFields({}, request)

		expect(result.Fields).toEqual(["*"])
	})

	// Manage concurrent filter-expression and filter fields in GetFilter
	it("should return filter object", () => {
		const provider = new DataProviderOptions()
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
			filter: { status: "active" },
		}

		const result = provider.GetFilter({}, request)

		expect(result.Filter).toEqual({ status: "active" })
	})

	// Process empty or malformed sort parameters
	it("should handle empty sort parameter", () => {
		const provider = new DataProviderOptions()
		const request: TSchemaRequest = {
			schema: "test",
			entity: "entity",
			sort: undefined,
		}

		const result = provider.GetSort({}, request)

		expect(result.Sort).toBe(undefined)
	})
})
