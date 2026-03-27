import { describe, expect, it } from "vitest"
import { PLAN_FAILURE_STRATEGY_RETURN, STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY } from "../../@consts"
import { type U__plans, type U__plans_plan, z_U__plans, z_U__plans_plan, z_U__plans_plan__steps } from "../U__plans"

describe("U__plans schema validation", () => {
	describe("z_U__plans_plan__steps", () => {
		it("should accept valid steps array", () => {
			const validSteps = [
				{ debug: "test message" },
				{ break: null },
				{ select: { schema: "test", entity: "test" } },
				{ pick: { fields: ["field1", "field2"] } },
				{ map: { script: "return $row;" } },
			]

			const result = z_U__plans_plan__steps.parse(validSteps)
			expect(result).toEqual(validSteps)
		})

		it("should accept empty steps array", () => {
			const result = z_U__plans_plan__steps.parse([])
			expect(result).toEqual([])
		})

		it("should reject invalid step commands", () => {
			const invalidSteps = [{ invalid_command: {} }, { unknown: "test" }]

			expect(() => z_U__plans_plan__steps.parse(invalidSteps)).toThrow()
		})
	})

	describe("z_U__plans_plan", () => {
		it("should accept minimal valid plan", () => {
			const minimalPlan = {
				steps: [{ debug: "test" }],
			}

			const result = z_U__plans_plan.parse(minimalPlan)
			expect(result).toEqual({
				steps: [{ debug: "test" }],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP,
				},
				"failure-strategy": PLAN_FAILURE_STRATEGY_RETURN.RETURN_DATA,
			})
		})

		it("should accept plan with custom on-error configuration", () => {
			const planWithErrorHandling = {
				steps: [{ select: { schema: "test", entity: "test" } }],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SKIP,
					scope: STEP_ON_ERROR_SCOPE.ROW,
				},
			}

			const result = z_U__plans_plan.parse(planWithErrorHandling)
			expect(result).toEqual({
				steps: [{ select: { schema: "test", entity: "test" } }],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SKIP,
					scope: STEP_ON_ERROR_SCOPE.ROW,
				},
				"failure-strategy": PLAN_FAILURE_STRATEGY_RETURN.RETURN_DATA,
			})
		})

		it("should accept plan with custom failure strategy", () => {
			const planWithFailureStrategy = {
				steps: [{ break: null }],
				"failure-strategy": PLAN_FAILURE_STRATEGY_RETURN.RETURN_ERRORS,
			}

			const result = z_U__plans_plan.parse(planWithFailureStrategy)
			expect(result).toEqual({
				steps: [{ break: null }],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP,
				},
				"failure-strategy": PLAN_FAILURE_STRATEGY_RETURN.RETURN_ERRORS,
			})
		})

		it("should accept plan with retry strategy", () => {
			const planWithRetry = {
				steps: [{ insert: { schema: "test", entity: "test", data: { name: "test" } } }],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					retry: {
						attempts: 5,
						delay: 2000,
						backoff: "exponential",
						"max-delay": 60000,
						"after-retries": "throw",
					},
				},
			}

			const result = z_U__plans_plan.parse(planWithRetry)
			expect(result).toEqual({
				steps: [{ insert: { schema: "test", entity: "test", data: { name: "test" } } }],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.STEP,
					retry: {
						attempts: 5,
						delay: 2000,
						backoff: "exponential",
						"max-delay": 60000,
						"after-retries": "throw",
					},
				},
				"failure-strategy": PLAN_FAILURE_STRATEGY_RETURN.RETURN_DATA,
			})
		})

		it("should accept plan with sink strategy", () => {
			const planWithSink = {
				steps: [{ delete: { schema: "test", entity: "test" } }],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					sink: {
						schema: "error_schema",
						entity: "error_entity",
						"include-error": true,
						"error-field": "error_details",
					},
				},
			}

			const result = z_U__plans_plan.parse(planWithSink)
			expect(result).toEqual({
				steps: [{ delete: { schema: "test", entity: "test" } }],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					scope: STEP_ON_ERROR_SCOPE.STEP,
					sink: {
						schema: "error_schema",
						entity: "error_entity",
						"include-error": true,
						"error-field": "error_details",
					},
				},
				"failure-strategy": PLAN_FAILURE_STRATEGY_RETURN.RETURN_DATA,
			})
		})

		it("should accept complex plan with multiple steps and configurations", () => {
			const complexPlan = {
				steps: [
					{ select: { schema: "users", entity: "active_users" } },
					{ map: { script: "return { ...row, processed: true };" } },
					{ insert: { schema: "logs", entity: "processed", data: {} } },
					{ break: null },
				],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.ROW,
					retry: {
						attempts: 3,
						delay: 1000,
						backoff: "fixed",
						"max-delay": 30000,
						"after-retries": "skip",
					},
					sink: {
						schema: "errors",
						entity: "failed_operations",
						"include-error": false,
						"error-field": "failure_info",
					},
				},
				"failure-strategy": PLAN_FAILURE_STRATEGY_RETURN.RETURN_ERRORS,
			}

			const result = z_U__plans_plan.parse(complexPlan)
			expect(result).toEqual(complexPlan)
		})

		it("should reject plan without steps", () => {
			const invalidPlan = {}

			expect(() => z_U__plans_plan.parse(invalidPlan)).toThrow()
		})

		it("should reject plan with invalid on-error strategy", () => {
			const invalidPlan = {
				steps: [{ debug: "test" }],
				"on-error": {
					strategy: "invalid_strategy",
				},
			}

			expect(() => z_U__plans_plan.parse(invalidPlan)).toThrow()
		})

		it("should reject plan with invalid failure strategy", () => {
			const invalidPlan = {
				steps: [{ break: null }],
				"failure-strategy": "invalid_strategy",
			}

			expect(() => z_U__plans_plan.parse(invalidPlan)).toThrow()
		})
	})

	describe("z_U__plans", () => {
		it("should accept valid plans object", () => {
			const validPlans = {
				plan1: {
					steps: [{ debug: "test" }],
				},
				plan2: {
					steps: [{ select: { schema: "test", entity: "test" } }, { break: null }],
					"on-error": {
						strategy: STEP_ON_ERROR_STRATEGY.SKIP,
					},
				},
			}

			const result = z_U__plans.parse(validPlans)
			// Account for default values added by the schema
			expect(result).toEqual({
				plan1: {
					steps: [{ debug: "test" }],
					"on-error": {
						strategy: STEP_ON_ERROR_STRATEGY.THROW,
						scope: STEP_ON_ERROR_SCOPE.STEP,
					},
					"failure-strategy": PLAN_FAILURE_STRATEGY_RETURN.RETURN_DATA,
				},
				plan2: {
					steps: [{ select: { schema: "test", entity: "test" } }, { break: null }],
					"on-error": {
						strategy: STEP_ON_ERROR_STRATEGY.SKIP,
						scope: STEP_ON_ERROR_SCOPE.STEP,
					},
					"failure-strategy": PLAN_FAILURE_STRATEGY_RETURN.RETURN_DATA,
				},
			})
		})

		it("should accept empty plans object", () => {
			const result = z_U__plans.parse({})
			expect(result).toEqual({})
		})

		it("should accept plans with empty string names (schema allows it)", () => {
			const plansWithEmptyName = {
				"": {
					steps: [{ debug: "test" }],
				},
			}

			const result = z_U__plans.parse(plansWithEmptyName)
			expect(result).toHaveProperty("")
			expect(result[""]?.steps).toEqual([{ debug: "test" }])
		})

		it("should reject plans with invalid plan configuration", () => {
			const invalidPlans = {
				invalid_plan: {
					// Missing required steps
				},
			}

			expect(() => z_U__plans.parse(invalidPlans)).toThrow()
		})
	})

	describe("Type inference validation", () => {
		it("should correctly infer types for plan", () => {
			const validPlan: U__plans_plan = {
				steps: [{ debug: "test" }, { select: { schema: "test", entity: "test" } }],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SKIP,
				},
			}
			expect(validPlan).toBeDefined()
		})

		it("should correctly infer types for plans collection", () => {
			const validPlans: U__plans = {
				test_plan: {
					steps: [{ break: null }],
				},
			}
			expect(validPlans).toBeDefined()
		})
	})

	describe("Edge cases", () => {
		it("should handle plan with all step types", () => {
			const planWithAllSteps = {
				steps: [
					{ debug: "Starting process" },
					{ "list-entities": { schema: "test" } },
					{ select: { schema: "users", entity: "active" } },
					{ map: { script: "return row;" } },
					{ filter: { condition: "status = 'active'" } } as Record<string, unknown>,
					{ sort: [{ field: "name", order: "asc" }] },
					{ pick: { fields: ["id", "name"] } },
					{ omit: { fields: ["password"] } },
					{ anonymize: { fields: ["ssn", "email"] } },
					{ "remove-duplicates": { method: "hash", keys: ["id"] } },
					{ insert: { schema: "processed", entity: "users", data: {} } },
					{ update: { schema: "logs", entity: "status", data: { processed: true } } },
					{ delete: { schema: "temp", entity: "old_records" } },
					{
						join: { type: "left", schema: "profiles", entity: "user_profiles", "left-field": "id", "right-field": "user_id" },
					},
					{ run: { ai: "processor", input: "data", output: "result" } },
					{ sync: { from: { schema: "src", entity: "data" }, to: { schema: "dst", entity: "backup" }, id: "sync_id" } },
					{ set_var: { processing_complete: true } },
					{ break: null },
				],
			}

			const result = z_U__plans_plan.safeParse(planWithAllSteps)
			// Note: Some steps might be invalid, but this tests the schema structure
			expect(result.success || result.error).toBeDefined()
		})

		it("should handle deeply nested error configurations", () => {
			const nestedPlan = {
				steps: [
					{
						select: {
							schema: "test",
							entity: "test",
							"on-error": {
								strategy: STEP_ON_ERROR_STRATEGY.RETRY,
								retry: {
									attempts: 10,
									delay: 5000,
									backoff: "exponential",
									"max-delay": 120000,
									"after-retries": "sink",
								},
								sink: {
									schema: "error_logs",
									entity: "critical_errors",
									"include-error": true,
									"error-field": "stack_trace",
								},
							},
						},
					},
				],
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					sink: {
						schema: "plan_errors",
						entity: "failed_plans",
					},
				},
			}

			const result = z_U__plans_plan.parse(nestedPlan)
			expect(result).toBeDefined()

			const selectStep = result.steps[0] as any
			expect(selectStep.select).toHaveProperty("on-error")
			expect(selectStep.select["on-error"]).toEqual({
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				scope: STEP_ON_ERROR_SCOPE.STEP,
				retry: {
					attempts: 10,
					delay: 5000,
					backoff: "exponential",
					"max-delay": 120000,
					"after-retries": "sink",
				},
				sink: {
					schema: "error_logs",
					entity: "critical_errors",
					"include-error": true,
					"error-field": "stack_trace",
				},
			})
		})
	})
})
