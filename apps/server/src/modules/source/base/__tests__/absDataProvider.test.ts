import { describe, expect, it } from "vitest"
import type { DataTable } from "../../../../types/DataTable"
import { SqlQueryUtils } from "../../../../utils/SqlQueryUtils"
import { HTTP_STATUS_CODE } from "../../../core/@consts"
import type { TInternalResponse } from "../../../core/types/TInternalResponse"
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
})
