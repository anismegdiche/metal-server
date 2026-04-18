import { describe, expect, it } from "vitest"
import { STEP, STEP_ON_ERROR_RETRY_AFTER_RETRIES, STEP_ON_ERROR_RETRY_BACKOFF, STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY } from "../../@consts"
import {
	z_U__on_error,
	z_U__on_error_Params,
	z_U__on_error_strategy_retry,
	z_U__on_error_strategy_sink,
	z_U__on_error_strategy_skip,
	z_U__on_error_strategy_throw,
	z__on_error_retry,
	z__on_error_scope,
	z__on_error_sink
} from "../U__plans_plan_on_error"
import { z_U__plans_plan, type U__plans_plan } from "../U__plans"

describe("z_U__on_error schema validation", () => {
	describe("z_U__on_error (main schema)", () => {

		it("should accept valid on-error configuration", () => {
			const validConfig = {
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.THROW
				}
			}
			const result = z_U__on_error.parse(validConfig)
			expect(result).toEqual({
				"on-error": {
					...validConfig["on-error"],
					"scope": "step"
				}
			})
		})
	})

	describe("defaults", () => {
		it("should generate default on-error in plan level if not specified", () => {
			const planValid: U__plans_plan = {
				steps: [
					{
						select: {
							schema: "my-schema",
							entity: "my-entity"
						}
					},
					{
						delete: {
							schema: "my-schema",
							entity: "my-entity",
							"on-error": {
								strategy: STEP_ON_ERROR_STRATEGY.SKIP,
								scope: STEP_ON_ERROR_SCOPE.ROW
							}
						}
					},
					{
						insert: {
							schema: "my-schema",
							entity: "my-entity",
							"on-error": {
								strategy: STEP_ON_ERROR_STRATEGY.SINK,
								scope: STEP_ON_ERROR_SCOPE.ROW,
								sink: {
									schema: "my-error-schema",
									entity: "my-error-entity",
									"include-error": true,
									"error-field": "error"
								}
							}
						}
					},
					{
						break: null
					}
				]
			}

			const result = z_U__plans_plan.parse(planValid)

			expect(result["on-error"]).toEqual({
				strategy: STEP_ON_ERROR_STRATEGY.THROW,
				scope: STEP_ON_ERROR_SCOPE.STEP
			})
		})
	})

	describe("z_U__on_error_Params (discriminated union)", () => {
		describe("THROW strategy", () => {
			it("should accept minimal throw strategy", () => {
				const config = { strategy: STEP_ON_ERROR_STRATEGY.THROW }
				const result = z_U__on_error_Params.parse(config)
				expect(result).toEqual({
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				})
			})

			it("should accept throw strategy with explicit step scope", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.STEP
				}
				const result = z_U__on_error_Params.parse(config)
				expect(result).toEqual(config)
			})

			it("should reject throw strategy with non-step scope", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.THROW,
					scope: STEP_ON_ERROR_SCOPE.ROW
				}
				expect(() => z_U__on_error_Params.parse(config)).toThrow()
			})
		})

		describe("SKIP strategy", () => {
			it("should accept minimal skip strategy", () => {
				const config = { strategy: STEP_ON_ERROR_STRATEGY.SKIP }
				const result = z_U__on_error_Params.parse(config)
				expect(result).toEqual({
					strategy: STEP_ON_ERROR_STRATEGY.SKIP,
					scope: STEP_ON_ERROR_SCOPE.STEP
				})
			})

			it("should accept skip strategy with scope", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.SKIP,
					scope: STEP_ON_ERROR_SCOPE.ROW
				}
				const result = z_U__on_error_Params.parse(config)
				expect(result).toEqual(config)
			})

			it("should accept skip strategy with all valid scopes", () => {
				const validScopes = [
					STEP_ON_ERROR_SCOPE.STEP,
					STEP_ON_ERROR_SCOPE.ROW,
				]

				validScopes.forEach(scope => {
					const config = {
						strategy: STEP_ON_ERROR_STRATEGY.SKIP,
						scope
					}
					expect(() => z_U__on_error_Params.parse(config)).not.toThrow()
				})
			})
		})

		describe("RETRY strategy", () => {
			it("should accept minimal retry strategy", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.STEP,  // Required for discriminated union
					retry: {
						attempts: 3  // Only provide minimal required field
					}
				}
				const result = z_U__on_error_Params.parse(config)
				expect(result).toEqual({
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.STEP,
					retry: {
						attempts: 3,
						delay: 1000,  // Default should be applied
						backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,  // Default should be applied
						"max-delay": 30000,  // Default should be applied
						"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW  // Default should be applied
					}
				})
			})

			it("should accept retry strategy with scope", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.ROW,
					retry: {
						attempts: 5,
						delay: 2000,
						backoff: STEP_ON_ERROR_RETRY_BACKOFF.EXPONENTIAL,
						"max-delay": 60000,
						"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP
					}
				}
				const result = z_U__on_error_Params.parse(config)
				expect(result).toEqual(config)
			})

			it("should accept retry strategy with sink", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.ROW,  // ROW scope required for sink
					retry: {
						attempts: 2,
						delay: 500,
						backoff: STEP_ON_ERROR_RETRY_BACKOFF.LINEAR,
						"max-delay": 10000,
						"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW
					},
					sink: {
						schema: "error_schema",
						entity: "error_entity",
						"include-error": false,
						"error-field": "custom_error_field"
					}
				}
				const result = z_U__on_error_Params.parse(config)
				expect(result).toEqual(config)
			})

			it("should reject retry strategy without retry configuration", () => {
				const config = { strategy: STEP_ON_ERROR_STRATEGY.RETRY }
				expect(() => z_U__on_error_Params.parse(config)).toThrow()
			})

			it("should reject retry strategy with invalid attempts", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					retry: {
						attempts: 0,
						delay: 1000,
						backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
						"max-delay": 30000,
						"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW
					}
				}
				expect(() => z_U__on_error_Params.parse(config)).toThrow()
			})

			it("should reject retry strategy with negative delay", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					retry: {
						attempts: 3,
						delay: -100,
						backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
						"max-delay": 30000,
						"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW
					}
				}
				expect(() => z_U__on_error_Params.parse(config)).toThrow()
			})
		})

		describe("SINK strategy", () => {
			it("should accept minimal sink strategy", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					sink: {
						schema: "error_schema",
						entity: "error_entity"
					}
				}
				const result = z_U__on_error_Params.parse(config)
				expect(result).toEqual({
					scope: STEP_ON_ERROR_SCOPE.ROW,
					...config,
					sink: {
						...config.sink,
						"error-field": "error-details",
						"include-error": true
					}
				})
			})

			it("should accept sink strategy with scope", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					scope: STEP_ON_ERROR_SCOPE.ROW,
					sink: {
						schema: "error_schema",
						entity: "error_entity",
						"include-error": true,
						"error-field": "error-details"
					}
				}
				const result = z_U__on_error_Params.parse(config)
				expect(result).toEqual(config)
			})

			it("should reject sink strategy without sink configuration", () => {
				const config = { strategy: STEP_ON_ERROR_STRATEGY.SINK }
				expect(() => z_U__on_error_Params.parse(config)).toThrow()
			})

			it("should reject sink strategy with empty schema", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					sink: {
						schema: "",
						entity: "error_entity"
					}
				}
				const result = z_U__on_error_Params.safeParse(config)
				expect(result.success).toEqual(false)
			})

			it("should reject sink strategy with empty entity", () => {
				const config = {
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					sink: {
						schema: "error_schema",
						entity: ""
					}
				}
				expect(() => z_U__on_error_Params.parse(config)).toThrow()
			})
		})

		describe("Invalid strategies", () => {
			it("should reject invalid strategy", () => {
				const config = { strategy: "invalid_strategy" }
				expect(() => z_U__on_error_Params.parse(config)).toThrow()
			})

			it("should reject missing strategy", () => {
				const config = {}
				expect(() => z_U__on_error_Params.parse(config)).toThrow()
			})
		})
	})

	describe("Individual strategy schemas", () => {
		it("z_U__on_error_strategy_throw should validate correctly", () => {
			const valid = { strategy: STEP_ON_ERROR_STRATEGY.THROW }
			expect(() => z_U__on_error_strategy_throw.parse(valid)).not.toThrow()
		})

		it("z_U__on_error_strategy_skip should validate correctly", () => {
			const valid = { strategy: STEP_ON_ERROR_STRATEGY.SKIP }
			expect(() => z_U__on_error_strategy_skip.parse(valid)).not.toThrow()
		})

		it("z_U__on_error_strategy_retry should validate correctly", () => {
			const valid = {
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				scope: STEP_ON_ERROR_SCOPE.STEP,  // Required for discriminated union
				retry: {
					attempts: 3,
					delay: 1000,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					"max-delay": 30000,
					"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW
				}
			}
			expect(() => z_U__on_error_strategy_retry.parse(valid)).not.toThrow()
		})

		it("z_U__on_error_strategy_sink should validate correctly", () => {
			const valid = {
				strategy: STEP_ON_ERROR_STRATEGY.SINK,
				sink: {
					schema: "test_schema",
					entity: "test_entity"
				}
			}
			expect(() => z_U__on_error_strategy_sink.parse(valid)).not.toThrow()
		})
	})

	describe("Helper schemas", () => {
		describe("z__on_error_scope", () => {
			it("should accept all valid scope values", () => {
				const validScopes = [
					STEP_ON_ERROR_SCOPE.STEP,
					STEP_ON_ERROR_SCOPE.ROW
				]

				validScopes.forEach(scope => {
					expect(() => z__on_error_scope.parse(scope)).not.toThrow()
				})
			})

			it("should use default scope", () => {
				const result = z__on_error_scope.parse(undefined)
				expect(result).toBe(STEP_ON_ERROR_SCOPE.STEP)
			})

			it("should reject invalid scope", () => {
				expect(() => z__on_error_scope.parse("invalid")).toThrow()
			})
		})

		describe("z__on_error_retry", () => {
			it("should use default values", () => {
				const result = z__on_error_retry.parse({})
				expect(result).toEqual({
					attempts: 1,
					delay: 1000,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					"max-delay": 30000,
					"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW
				})
			})

			it("should accept all valid backoff strategies", () => {
				const validBackoffs = [
					STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					STEP_ON_ERROR_RETRY_BACKOFF.LINEAR,
					STEP_ON_ERROR_RETRY_BACKOFF.EXPONENTIAL
				]

				validBackoffs.forEach(backoff => {
					const config = { backoff }
					expect(() => z__on_error_retry.parse(config)).not.toThrow()
				})
			})

			it("should accept all valid after-retries strategies", () => {
				const validAfterRetries = [
					STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW,
					STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP,
					STEP_ON_ERROR_RETRY_AFTER_RETRIES.SINK
				]

				validAfterRetries.forEach(afterRetries => {
					const config = { "after-retries": afterRetries }
					expect(() => z__on_error_retry.parse(config)).not.toThrow()
				})
			})
		})

		describe("z__on_error_sink", () => {
			it("should use default values", () => {
				const config = {
					schema: "test_schema",
					entity: "test_entity"
				}
				const result = z__on_error_sink.parse(config)
				expect(result).toEqual({
					schema: "test_schema",
					entity: "test_entity",
					"include-error": true,
					"error-field": "error-details"
				})
			})

			it("should accept custom sink configuration", () => {
				const config = {
					schema: "custom_schema",
					entity: "custom_entity",
					"include-error": false,
					"error-field": "custom_error_field"
				}
				const result = z__on_error_sink.parse(config)
				expect(result).toEqual(config)
			})
		})
	})

	describe("Complex scenarios", () => {
		it("should validate complete retry strategy with sink and all options", () => {
			const complexConfig = {
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.RETRY,
					scope: STEP_ON_ERROR_SCOPE.ROW,
					retry: {
						attempts: 10,
						delay: 5000,
						backoff: STEP_ON_ERROR_RETRY_BACKOFF.EXPONENTIAL,
						"max-delay": 120000,
						"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.SINK
					},
					sink: {
						schema: "error_logs",
						entity: "error_records",
						"include-error": true,
						"error-field": "stack_trace"
					}
				}
			}
			const result = z_U__on_error.parse(complexConfig)
			expect(result).toEqual(complexConfig)
		})

		it("should validate complete sink strategy", () => {
			const complexConfig = {
				"on-error": {
					strategy: STEP_ON_ERROR_STRATEGY.SINK,
					scope: STEP_ON_ERROR_SCOPE.ROW,
					sink: {
						schema: "plan_errors",
						entity: "failed_plans",
						"include-error": false,
						"error-field": "failure_reason"
					}
				}
			}
			const result = z_U__on_error.parse(complexConfig)
			expect(result).toEqual(complexConfig)
		})
	})
})
