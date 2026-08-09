import { describe, expect, it } from "vitest"
import { z_TSchemaRequestSelect } from "../TSchemaRequest"

describe("TSchemaRequest", () => {
	describe("z_TSchemaRequestSelect", () => {
		it("should accept limit and offset", () => {
			const result = z_TSchemaRequestSelect.parse({
				schema: "my_schema",
				entity: "my_entity",
				limit: 10,
				offset: 5,
			})
			expect(result).toEqual({
				schema: "my_schema",
				entity: "my_entity",
				limit: 10,
				offset: 5,
			})
		})

		it("should accept limit without offset", () => {
			const result = z_TSchemaRequestSelect.parse({
				schema: "my_schema",
				entity: "my_entity",
				limit: 25,
			})
			expect(result.limit).toBe(25)
			expect(result.offset).toBeUndefined()
		})

		it("should coerce string limit and offset to numbers", () => {
			const result = z_TSchemaRequestSelect.parse({
				schema: "my_schema",
				entity: "my_entity",
				limit: "10",
				offset: "5",
			})
			expect(result.limit).toBe(10)
			expect(result.offset).toBe(5)
		})

		it("should accept offset zero", () => {
			const result = z_TSchemaRequestSelect.parse({
				schema: "my_schema",
				entity: "my_entity",
				offset: 0,
			})
			expect(result.offset).toBe(0)
		})

		it("should reject limit zero", () => {
			expect(() =>
				z_TSchemaRequestSelect.parse({
					schema: "my_schema",
					entity: "my_entity",
					limit: 0,
				}),
			).toThrow()
		})

		it("should reject negative limit", () => {
			expect(() =>
				z_TSchemaRequestSelect.parse({
					schema: "my_schema",
					entity: "my_entity",
					limit: -1,
				}),
			).toThrow()
		})

		it("should reject negative offset", () => {
			expect(() =>
				z_TSchemaRequestSelect.parse({
					schema: "my_schema",
					entity: "my_entity",
					offset: -1,
				}),
			).toThrow()
		})

		it("should reject non-integer limit", () => {
			expect(() =>
				z_TSchemaRequestSelect.parse({
					schema: "my_schema",
					entity: "my_entity",
					limit: 1.5,
				}),
			).toThrow()
		})
	})
})
