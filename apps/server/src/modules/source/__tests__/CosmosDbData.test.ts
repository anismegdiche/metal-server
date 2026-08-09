import { describe, expect, it } from "vitest"
import type { TSchemaRequest } from "../../schema/types/TSchemaRequest"
import type { TOptionalParameter } from "../@types"
import { CosmosDbData } from "../providers/CosmosDbData"

describe("CosmosDbData", () => {
	describe("GenerateCosmosCountQuery", () => {
		it("should generate an unfiltered count query in Cosmos syntax", () => {
			const provider = new CosmosDbData()
			const schemaRequest = <TSchemaRequest>{ schema: "s", entity: "e" }
			const options = <TOptionalParameter>{}

			const query = provider.GenerateCosmosCountQuery(schemaRequest, options)

			expect(query).toBe("SELECT VALUE COUNT(1) FROM c")
		})

		it("should preserve the filter in the count query", () => {
			const provider = new CosmosDbData()
			const schemaRequest = <TSchemaRequest>{ schema: "s", entity: "e" }
			const options = <TOptionalParameter>{ Filter: { status: "active" } }

			const query = provider.GenerateCosmosCountQuery(schemaRequest, options)

			expect(query).toBe("SELECT VALUE COUNT(1) FROM c WHERE c.status = 'active'")
		})

		it("should escape fields with the c. prefix in the count filter", () => {
			const provider = new CosmosDbData()
			const schemaRequest = <TSchemaRequest>{ schema: "s", entity: "e" }
			const options = <TOptionalParameter>{ Filter: { "order-date": "2024-01-01" } }

			const query = provider.GenerateCosmosCountQuery(schemaRequest, options)

			expect(query).toBe("SELECT VALUE COUNT(1) FROM c WHERE c.order-date = '2024-01-01'")
		})
	})
})
