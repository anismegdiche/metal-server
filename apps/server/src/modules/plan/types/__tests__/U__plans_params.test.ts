import { describe, expect, it } from "vitest"
import { STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY } from "../../@consts"
import {
	z_U__plans_plan_select_Params,
	z_U__plans_plan_insert_Params,
	z_U__plans_plan_update_Params,
	z_U__plans_plan_delete_Params,
	z_U__plans_plan_list_entities_Params,
	type U__plans_plan_select_Params,
	type U__plans_plan_insert_Params,
	type U__plans_plan_update_Params,
	type U__plans_plan_delete_Params,
	type U__plans_plan_list_entities_Params,
} from "../U__plans_params"
import { DT_SYS_FIELDS } from "../../../../types/DataTableTypes"

describe("CRUD operation schema validation", () => {
	describe("z_U__plans_plan_select_Params", () => {
		it("should accept null", () => {
			const result = z_U__plans_plan_select_Params.parse(null)
			expect(result).toBe(null)
		})

		it("should accept error handling only", () => {
			const config = {
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SKIP,
					scope: STEP_ON_ERROR_SCOPE.ROW
				}
			}
			const result = z_U__plans_plan_select_Params.parse(config)
			expect(result).toEqual(config)
		})

		it("should accept partial schema request", () => {
			const config = {
				schema: "test_schema",
				entity: "test_entity",
				fields: "field1,field2"
			}
			const result = z_U__plans_plan_select_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept omitted schema request", () => {
			const config = {
				fields: "field1,field2",
				filter: { status: "active" }
			}
			const result = z_U__plans_plan_select_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept partial with error handling", () => {
			const config = {
				schema: "test_schema",
				entity: "test_entity",
				fields: "field1,field2",
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.STEP,
					retry: {
						"after-retries": "throw",
						"attempts": 3,
						"backoff": "fixed",
						"delay": 1000,
						"max-delay": 30000,
					}
				}
			}
			const result = z_U__plans_plan_select_Params.parse(config)
			expect(result).toEqual(config)
		})

		it("should accept limit and offset", () => {
			const config = {
				limit: 10,
				offset: 5,
			}
			const result = z_U__plans_plan_select_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should coerce string limit and offset to numbers", () => {
			const result = z_U__plans_plan_select_Params.parse({
				limit: "10",
				offset: "5",
			})
			expect(result).toEqual({
				limit: 10,
				offset: 5,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should reject negative limit", () => {
			expect(() => z_U__plans_plan_select_Params.parse({ limit: -1 })).toThrow()
		})

		it("should reject negative offset", () => {
			expect(() => z_U__plans_plan_select_Params.parse({ offset: -1 })).toThrow()
		})

		it("should reject non-integer limit", () => {
			expect(() => z_U__plans_plan_select_Params.parse({ limit: 1.5 })).toThrow()
		})
	})

	describe("z_U__plans_plan_insert_Params", () => {
		it("should accept null", () => {
			const result = z_U__plans_plan_insert_Params.parse(null)
			expect(result).toBe(null)
		})

		it("should accept error handling only", () => {
			const config = {
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			}
			const result = z_U__plans_plan_insert_Params.parse(config)
			expect(result).toEqual(config)
		})

		it("should accept partial schema request", () => {
			const config = {
				schema: "test_schema",
				entity: "test_entity",
				data: { name: "test", value: 123 }
			}
			const result = z_U__plans_plan_insert_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept omitted schema request", () => {
			const config = {
				data: { name: "test", value: 123 }
			}
			const result = z_U__plans_plan_insert_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept partial with error handling", () => {
			const config = {
				schema: "test_schema",
				entity: "test_entity",
				data: { name: "test" },
				"on-error": {
					scope: STEP_ON_ERROR_SCOPE.ROW,
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					sink: {
						schema: "error_schema",
						entity: "error_entity",
						"error-field": "error-details",
						"include-error": true,
					}
				}
			}
			const result = z_U__plans_plan_insert_Params.parse(config)
			expect(result).toEqual(config)
		})
	})

	describe("z_U__plans_plan_update_Params", () => {
		it("should accept null", () => {
			const result = z_U__plans_plan_update_Params.parse(null)
			expect(result).toBe(null)
		})

		it("should accept error handling only", () => {
			const config = {
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SKIP,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			}
			const result = z_U__plans_plan_update_Params.parse(config)
			expect(result).toEqual(config)
		})

		it("should accept partial schema request", () => {
			const config = {
				schema: "test_schema",
				entity: "test_entity",
				data: { status: "updated" },
				filter: { id: 123 }
			}
			const result = z_U__plans_plan_update_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept omitted schema request", () => {
			const config = {
				data: { status: "updated" },
				"filter-expression": "id > 100"
			}
			const result = z_U__plans_plan_update_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept partial with error handling", () => {
			const config = {
				schema: "test_schema",
				entity: "test_entity",
				data: { status: "updated" },
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.STEP,
					retry: {
						attempts: 5,
						delay: 2000,
						backoff: "exponential",
						"max-delay": 30000,
						"after-retries": "throw",
					}
				}
			}
			const result = z_U__plans_plan_update_Params.parse(config)
			expect(result).toEqual(config)
		})
	})

	describe("z_U__plans_plan_delete_Params", () => {
		it("should accept null", () => {
			const result = z_U__plans_plan_delete_Params.parse(null)
			expect(result).toBe(null)
		})

		it("should accept error handling only", () => {
			const config = {
				"on-error": {
					scope: STEP_ON_ERROR_SCOPE.ROW,
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					sink: {
						schema: "error_schema",
						entity: "error_entity",
						"error-field": "error-details",
						"include-error": true,
					}
				}
			}
			const result = z_U__plans_plan_delete_Params.parse(config)
			expect(result).toEqual(config)
		})

		it("should accept partial schema request", () => {
			const config = {
				schema: "test_schema",
				entity: "test_entity",
				filter: { status: "inactive" }
			}
			const result = z_U__plans_plan_delete_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept omitted schema request", () => {
			const config = {
				"filter-expression": `${DT_SYS_FIELDS.created_at} < '2024-01-01'`
			}
			const result = z_U__plans_plan_delete_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept partial with error handling", () => {
			const config = {
				schema: "test_schema",
				entity: "test_entity",
				filter: { status: "inactive" },
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SKIP,
					scope: STEP_ON_ERROR_SCOPE.ROW
				}
			}
			const result = z_U__plans_plan_delete_Params.parse(config)
			expect(result).toEqual(config)
		})
	})

	describe("z_U__plans_plan_list_entities_Params", () => {
		it("should accept null", () => {
			const result = z_U__plans_plan_list_entities_Params.parse(null)
			expect(result).toBe(null)
		})

		it("should accept error handling only", () => {
			const config = {
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			}
			const result = z_U__plans_plan_list_entities_Params.parse(config)
			expect(result).toEqual(config)
		})

		it("should accept schema request", () => {
			const config = {
				schema: "test_schema"
			}
			const result = z_U__plans_plan_list_entities_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept schema request with source", () => {
			const config = {
				schema: "test_schema",
				source: "test_source"
			}
			const result = z_U__plans_plan_list_entities_Params.parse(config)
			expect(result).toEqual({
				...config,
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
			})
		})

		it("should accept schema request with error handling", () => {
			const config = {
				schema: "test_schema",
				source: "test_source",
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.ROW,
					retry: {
						"after-retries": "throw",
						"attempts": 3,
						"backoff": "fixed",
						"delay": 1000,
						"max-delay": 30000,
					}
				}
			}
			const result = z_U__plans_plan_list_entities_Params.parse(config)
			expect(result).toEqual(config)
		})
	})

	describe("Type inference validation", () => {
		it("should correctly infer types for select params", () => {
			const validSelect: U__plans_plan_select_Params = {
				schema: "test",
				fields: "field1"
			}
			expect(validSelect).toBeDefined()
		})

		it("should correctly infer types for insert params", () => {
			const validInsert: U__plans_plan_insert_Params = {
				data: { name: "test" }
			}
			expect(validInsert).toBeDefined()
		})

		it("should correctly infer types for update params", () => {
			const validUpdate: U__plans_plan_update_Params = {
				data: { status: "active" },
				filter: { id: 1 }
			}
			expect(validUpdate).toBeDefined()
		})

		it("should correctly infer types for delete params", () => {
			const validDelete: U__plans_plan_delete_Params = {
				filter: { status: "inactive" }
			}
			expect(validDelete).toBeDefined()
		})

		it("should correctly infer types for list entities params", () => {
			const validListEntities: U__plans_plan_list_entities_Params = {
				schema: "test_schema",
				source: "test_source"
			}
			expect(validListEntities).toBeDefined()
		})

		it("should allow null for all params", () => {
			const nullSelect: U__plans_plan_select_Params = null
			const nullInsert: U__plans_plan_insert_Params = null
			const nullUpdate: U__plans_plan_update_Params = null
			const nullDelete: U__plans_plan_delete_Params = null
			const nullListEntities: U__plans_plan_list_entities_Params = null

			expect(nullSelect).toBe(null)
			expect(nullInsert).toBe(null)
			expect(nullUpdate).toBe(null)
			expect(nullDelete).toBe(null)
			expect(nullListEntities).toBe(null)
		})

		it("should allow error handling only for all params", () => {
			const errorConfig = {
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SKIP
				}
			}

			const errorSelect: U__plans_plan_select_Params = errorConfig as any
			const errorInsert: U__plans_plan_insert_Params = errorConfig as any
			const errorUpdate: U__plans_plan_update_Params = errorConfig as any
			const errorDelete: U__plans_plan_delete_Params = errorConfig as any
			const errorListEntities: U__plans_plan_list_entities_Params = errorConfig as any

			expect(errorSelect).toEqual(errorConfig)
			expect(errorInsert).toEqual(errorConfig)
			expect(errorUpdate).toEqual(errorConfig)
			expect(errorDelete).toEqual(errorConfig)
			expect(errorListEntities).toEqual(errorConfig)
		})
	})
})
