import { describe, expect, it } from "vitest"
import type { TSchemaRequestInsert, TSchemaRequestSelect } from "../../modules/schema/types/TSchemaRequest"
import { SORT_ORDER } from "../../types/DataTable"
import { clsContext } from "../base/clsContext"

describe("clsContext", () => {
	it("should map select request fields into context", () => {
		const ctx = new clsContext()
		const request: TSchemaRequestSelect = {
			schema: "schema-name",
			entity: "entity-name",
			fields: "id,name",
			filter: { active: true },
			sort: { id: SORT_ORDER.ASC },
			cache: 5,
		}

		const result = ctx.GetContext(request)

		expect(result.$entity).toBe("entity-name")
		expect(result.$schema).toBe("schema-name")
		expect(result.$options).toEqual({
			fields: "id,name",
			filter: { active: true },
			"filter-expression": undefined,
			sort: { id: "asc" },
			cache: 5,
			data: undefined,
		})
	})

	it("should handle requests without entity and schema", () => {
		const ctx = new clsContext()
		const request: TSchemaRequestInsert = {
			schema: "schema-name",
			entity: "entity-name",
			data: [{ id: 1 }],
		}

		const result = ctx.GetContext(request)

		expect(result.$entity).toBe("entity-name")
		expect(result.$schema).toBe("schema-name")
		expect(result.$options).toBeDefined()
		expect((result.$options! as { data?: unknown }).data).toEqual([{ id: 1 }])
	})
})
