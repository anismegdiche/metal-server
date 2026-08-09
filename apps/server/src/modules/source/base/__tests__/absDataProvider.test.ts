import { describe, expect, it } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { DATATABLE_PAGINATION_META } from "../../../../utils/DataTableUtils"
import { SqlQueryUtils } from "../../../../utils/SqlQueryUtils"
import { HTTP_STATUS_CODE } from "../../../core/@consts"
import type { TInternalResponse } from "../../../core/types/TInternalResponse"
import type { TSchemaRequest } from "../../../schema/types/TSchemaRequest"
import { DATA_PROVIDER } from "../../@consts"
import type { TOptionalParameter } from "../../@types"
import { absDataProvider } from "../absDataProvider"

class TestProvider extends absDataProvider {
	ProviderName = DATA_PROVIDER.MEMORY
	SourceName = "test"
	Config = {}

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}
	Connection = undefined

	async Connect(): Promise<void> {
		return
	}
	async Disconnect(): Promise<void> {
		return
	}
	async ListEntities(_schemaRequest: {
		schema: string
		source?: string
	}): Promise<TInternalResponse<{ schema: string; status: HTTP_STATUS_CODE.OK; data: DataTable; entity?: string }>> {
		const data = {} as unknown as DataTable
		return { StatusCode: HTTP_STATUS_CODE.OK, Body: { schema: "s", status: HTTP_STATUS_CODE.OK, data } }
	}
	async AddEntity(
		_schemaRequest: { schema: string; source?: string } | { schema: string; entity: string; source?: string },
	): Promise<TInternalResponse<undefined>> {
		return { StatusCode: HTTP_STATUS_CODE.OK, Body: undefined }
	}
	async Select(_schemaRequest: {
		schema: string
		entity: string
		source?: string
	}): Promise<TInternalResponse<{ schema: string; status: HTTP_STATUS_CODE.OK; data: DataTable; entity?: string }>> {
		const data = {} as unknown as DataTable
		return { StatusCode: HTTP_STATUS_CODE.OK, Body: { schema: "s", status: HTTP_STATUS_CODE.OK, data } }
	}
	async Insert(_schemaRequest: {
		schema: string
		entity: string
		source?: string
	}): Promise<TInternalResponse<undefined>> {
		return { StatusCode: HTTP_STATUS_CODE.OK, Body: undefined }
	}
	async Update(_schemaRequest: {
		schema: string
		entity: string
		source?: string
	}): Promise<TInternalResponse<undefined>> {
		return { StatusCode: HTTP_STATUS_CODE.OK, Body: undefined }
	}
	async Delete(_schemaRequest: {
		schema: string
		entity: string
		source?: string
	}): Promise<TInternalResponse<undefined>> {
		return { StatusCode: HTTP_STATUS_CODE.OK, Body: undefined }
	}
	EscapeEntity(entity: string): string {
		return `"${entity}"`
	}
	EscapeField(field: string): string {
		return `"${field}"`
	}
}

describe("absDataProvider", () => {
	it("should return undefined sql when no filters and wildcard", () => {
		const provider = new TestProvider()
		const helper = new SqlQueryUtils(undefined, provider.EscapeEntity, provider.EscapeField)
		const options: TOptionalParameter = { Fields: ["*"] }

		expect(provider.GetSqlQuery(helper, options)).toBeUndefined()
	})

	it("should return sql when fields are explicit", () => {
		const provider = new TestProvider()
		const helper = new SqlQueryUtils(undefined, provider.EscapeEntity, provider.EscapeField).Select(["id"]).From("table")
		const options: TOptionalParameter = { Fields: ["id"] }

		expect(provider.GetSqlQuery(helper, options)).toContain("SELECT")
	})

	it("should return sql when filter is present", () => {
		const provider = new TestProvider()
		const helper = new SqlQueryUtils(undefined, provider.EscapeEntity, provider.EscapeField)
			.Select(["*"])
			.From("table")
			.Where({ id: 1 })
		const options: TOptionalParameter = { Fields: ["*"], Filter: { id: 1 } }

		expect(provider.GetSqlQuery(helper, options)).toContain("WHERE")
	})

	it("should generate sql for select/insert/update/delete", async () => {
		const provider = new TestProvider()
		const schemaRequest = { schema: "s", entity: "e" }
		const dataTable = {
			Count: async () => 1,
			GetFieldNames: () => ["id"],
			Rows: async () => [{ id: 1 }],
		} as const
		const options = { Fields: ["id"], Data: dataTable } as unknown as TOptionalParameter

		const selectQuery = provider.GenerateSqlSelect(schemaRequest, options).Query()
		const insertQuery = (await provider.GenerateSqlInsert(schemaRequest, options)).Query()
		const updateQuery = (await provider.GenerateSqlUpdate(schemaRequest, options)).Query()
		const deleteQuery = provider.GenerateSqlDelete(schemaRequest, options).Query()

		expect(selectQuery).toContain("SELECT")
		expect(insertQuery).toContain("INSERT")
		expect(updateQuery).toContain("UPDATE")
		expect(deleteQuery).toContain("DELETE")
	})

	it("should append limit and offset to generated select when options are given", () => {
		const provider = new TestProvider()
		const schemaRequest = <TSchemaRequest>{ schema: "s", entity: "e" }
		const options = <TOptionalParameter>{ Fields: ["*"], Limit: 10, Offset: 5 }

		const query = provider.GenerateSqlSelect(schemaRequest, options).Query()

		expect(query).toBe('SELECT * FROM "e" LIMIT 10 OFFSET 5')
	})

	it("should not append limit and offset to generated select when options are not given", () => {
		const provider = new TestProvider()
		const schemaRequest = <TSchemaRequest>{ schema: "s", entity: "e" }
		const options = <TOptionalParameter>{ Fields: ["*"] }

		const query = provider.GenerateSqlSelect(schemaRequest, options).Query()

		expect(query).toBe('SELECT * FROM "e"')
	})

	it("should return sql when limit is present even with wildcard fields", () => {
		const provider = new TestProvider()
		const helper = new SqlQueryUtils(undefined, provider.EscapeEntity, provider.EscapeField)
			.Select(["*"])
			.From("table")
			.LimitOffset(10)
		const options: TOptionalParameter = { Fields: ["*"], Limit: 10 }

		expect(provider.GetSqlQuery(helper, options)).toContain("LIMIT 10")
	})

	it("should generate count query for entity", () => {
		const provider = new TestProvider()
		const schemaRequest = <TSchemaRequest>{ schema: "s", entity: "e" }
		const options = <TOptionalParameter>{}

		const query = provider.GenerateSqlCount(schemaRequest, options).Query()

		expect(query).toBe('SELECT COUNT(*) AS count FROM "e"')
	})

	it("should generate count query with filter", () => {
		const provider = new TestProvider()
		const schemaRequest = <TSchemaRequest>{ schema: "s", entity: "e" }
		const options = <TOptionalParameter>{ Filter: { status: "active" } }

		const query = provider.GenerateSqlCount(schemaRequest, options).Query()

		expect(query).toBe('SELECT COUNT(*) AS count FROM "e" WHERE "status" = \'active\'')
	})

	it("should set pagination meta when limit is given", async () => {
		const provider = new TestProvider()
		const data = new DataTable("pagination-test", [{ id: 1 }, { id: 2 }])
		await data.RowsSet()
		const options = <TOptionalParameter>{ Fields: ["*"], Limit: 2, Offset: 2 }

		const result = await provider.SetPagination(data, options, 5)

		expect(result.MetaData[DATATABLE_PAGINATION_META]).toEqual({
			total: 5,
			limit: 2,
			offset: 2,
			hasMore: true,
		})
	})

	it("should not set pagination meta when limit is not given", async () => {
		const provider = new TestProvider()
		const data = new DataTable("pagination-test-2", [{ id: 1 }])
		await data.RowsSet()
		const options = <TOptionalParameter>{ Fields: ["*"] }

		const result = await provider.SetPagination(data, options, 1)

		expect(result.MetaData[DATATABLE_PAGINATION_META]).toBeUndefined()
	})
})
