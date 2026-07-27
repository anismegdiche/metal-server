/** biome-ignore-all lint/suspicious/noExplicitAny: test usage */
/** biome-ignore-all lint/style/noNonNullAssertion: guarded by expectValidMetrics */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: mock complexity */

import { CustomEvent } from "@dimkl/events"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../types/DataTable"
import { Roles } from "../../auth/Roles"
import { METADATA } from "../../core/@consts"
import { ConfigManager } from "../../core/ConfigManager"
import { PLAN_FAILURE_STRATEGY, PLAN_STATUS, STEP_OUTCOME, STEP_SIGNAL, STEP_STATUS } from "../@consts"
import { Plan } from "../Plan"
import type { T_StepMetrics } from "../PlanMetrics"
import { PLAN_METRICS, PlanMetrics, type T_PlanMetrics } from "../PlanMetrics"
import { Step } from "../Step"
import { z_U__plans_plan } from "../types/U__plans"

vi.mock("../../core/ConfigManager")
vi.mock("../../auth/Roles")

vi.mock("../Step", () => ({
	Step: {
		ExecuteCaseMap: {},
		ExecuteOnError: vi.fn((fn: any, args: any, ctx: any) => fn(args, ctx)),
		GetStepParams: (step: any) => {
			const keys = Object.keys(step)
			const key = keys[0]
			return { command: key as any, params: step[key!] }
		},
		GetOnError: vi.fn(),
		OnErrorStep: vi.fn(async (stepFunction: any, stepParams: any, $context: any) => {
			const result = await stepFunction(stepParams, $context)
			// Return the data part of T_StepResult
			return result?.data
		}),
		OnErrorRow: vi.fn(),
		WrapStepWithSignal: vi.fn((fn: any, fnRow?: any, signal: STEP_SIGNAL = STEP_SIGNAL.NEXT) => {
			return async (stepParams: any, $context: any) => {
				const planName = $context?.$plan?.name
				const stepIndex = $context?.$plan?.currentStep?.index

				if (planName !== undefined && stepIndex !== undefined) {
					const stepStartTime = new Date()
					// Populate metrics directly in PlanMetrics.Metrics map
					const planMetrics = PlanMetrics.Get(planName)
					if (planMetrics) {
						planMetrics.steps[stepIndex] = {
							planName,
							index: stepIndex,
							step: { startTime: stepStartTime },
							attemptCount: 1,
							rows: { input: 0, passed: 0, skipped: 0, sunk: 0, failed: 0 },
						}
						PlanMetrics.Set(planName, planMetrics)
					}
				}

				try {
					const data = await fn(stepParams, $context)

					if (planName !== undefined && stepIndex !== undefined) {
						const stepEndTime = new Date()
						const planMetrics = PlanMetrics.Get(planName)
						if (planMetrics?.steps[stepIndex]) {
							const startTime = planMetrics.steps[stepIndex].step?.startTime
							const durationMs = startTime ? stepEndTime.getTime() - startTime.getTime() : 0
							planMetrics.steps[stepIndex] = {
								...planMetrics.steps[stepIndex],
								step: {
									...planMetrics.steps[stepIndex].step,
									endTime: stepEndTime,
									durationMs,
									status: STEP_STATUS.SUCCESS,
								},
							}
							PlanMetrics.Set(planName, planMetrics)
						}
					}

					return {
						data,
						signal,
						outcome: STEP_OUTCOME.SUCCESS,
						$context: $context as any,
					}
				} catch (_error) {
					if (planName !== undefined && stepIndex !== undefined) {
						const stepEndTime = new Date()
						const planMetrics = PlanMetrics.Get(planName)
						if (planMetrics?.steps[stepIndex]) {
							const startTime = planMetrics.steps[stepIndex].step?.startTime
							const durationMs = startTime ? stepEndTime.getTime() - startTime.getTime() : 0
							planMetrics.steps[stepIndex] = {
								...planMetrics.steps[stepIndex],
								step: {
									...planMetrics.steps[stepIndex].step,
									endTime: stepEndTime,
									durationMs,
									status: STEP_STATUS.FAILED,
								},
							}
							PlanMetrics.Set(planName, planMetrics)
						}
					}

					return {
						data: undefined,
						signal,
						outcome: STEP_OUTCOME.FAILED,
						$context: $context as any,
					}
				}
			}
		}),
	},
}))

vi.mock("../../../utils/SynchronizerManager", () => ({
	SynchronizerManager: {
		Synchronized: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
	},
}))

describe("Plan", () => {
	let plan: Plan

	// Helper function to mock Zod validation for tests
	// This mocks the original z_U__plans_plan.parse to accept mock commands
	const mockZodValidation = (config: any) => {
		return vi.spyOn(z_U__plans_plan, "parse").mockReturnValue(config as any)
	}

	const seedPlanMetrics = () => {
		PlanMetrics.Set("test-plan", {} as T_PlanMetrics)
	}

	const expectValidMetrics = (metrics: any, expectedStepCount: number) => {
		expect(metrics).toBeDefined()
		expect(metrics.planName).toBe("test-plan")
		expect(metrics.startTime).toBeInstanceOf(Date)
		expect(metrics.endTime).toBeInstanceOf(Date)
		expect(metrics.durationMs).toBeGreaterThanOrEqual(0)
		expect(metrics.steps).toHaveLength(expectedStepCount)
		expect([PLAN_STATUS.COMPLETED, PLAN_STATUS.COMPLETED_WITH_ERRORS]).toContain(metrics.status)
	}

	const expectValidStepEntry = (entry: any, expectedIndex: number, expectedStatus?: string) => {
		expect(entry).toBeDefined()
		expect(entry.index).toBe(expectedIndex)
		if (expectedStatus !== undefined) {
			expect(entry.step?.status).toBe(expectedStatus)
		}
	}

	beforeEach(async () => {
		vi.clearAllMocks()
		// PlanMetrics.Metrics.clear()
		// Mock Zod validation before creating plan to avoid validation errors during Init
		mockZodValidation({ steps: [] })
		plan = new Plan("test-plan")
		plan.Init()
	})

	it("should initialize and load plan configuration", async () => {
		const mockConfig = { steps: [{ step1: {} }] }

		vi.mocked(ConfigManager.Get).mockReturnValue(mockConfig)
		// Mock the Zod parse to return the config without validation
		const parseSpy = mockZodValidation(mockConfig)

		await plan.Init()

		expect(parseSpy).toHaveBeenCalledWith(mockConfig)
		expect(plan.Config).toEqual(mockConfig)
		expect(plan._data).toBeInstanceOf(DataTable)
		expect(plan._data.Name).toBe("test-plan")

		// Restore the mock
		parseSpy.mockRestore()
	})

	it("should fail ProcessSchemaRequest if plan not configured", async () => {
		vi.mocked(ConfigManager.Get).mockReturnValue(null)
		plan.Config = null // Reset config
		const result = await plan.ProcessSchemaRequest({ schema: "s", source: "s1" } as any)
		expect(result).toBeUndefined()
	})

	it("should load plan with custom step commands using mocked validation", async () => {
		const customConfig = {
			steps: [{ custom_step_1: { param1: "value1" } }, { custom_step_2: { param2: 42 } }, { another_custom: null }],
		}

		vi.mocked(ConfigManager.Get).mockReturnValue(customConfig)
		const parseSpy = mockZodValidation(customConfig)

		await plan.Init()

		expect(parseSpy).toHaveBeenCalledWith(customConfig)
		expect(plan.Config).toEqual(customConfig)
		expect(plan.Config?.steps).toHaveLength(3)

		parseSpy.mockRestore()
	})

	it("should handle complex plan configuration with mocked validation", async () => {
		const complexConfig = {
			steps: [{ step1: { data: "test" } }, { step2: { nested: { prop: "value" } } }, { step3: null }],
			"on-error": {
				strategy: "custom_strategy" as any,
				scope: "custom_scope" as any,
			},
			"failure-strategy": "custom_failure" as any,
		}

		vi.mocked(ConfigManager.Get).mockReturnValue(complexConfig)
		const parseSpy = mockZodValidation(complexConfig)

		await plan.Init()

		expect(parseSpy).toHaveBeenCalledWith(complexConfig)
		expect(plan.Config).toEqual(complexConfig)
		expect(plan.Config?.steps).toHaveLength(3)
		expect(plan.Config?.["on-error"]).toBeDefined()
		expect(plan.Config?.["failure-strategy"]).toBeDefined()

		parseSpy.mockRestore()
	})

	describe("Reload", () => {
		it("should reload plan configuration and re-init", async () => {
			const userToken: any = { roles: ["admin"] }
			const planConfig = { steps: [{ debug: "reloaded" }] }

			vi.mocked(ConfigManager.Load).mockResolvedValue({
				plans: { "test-plan": planConfig },
				schedules: {},
			} as any)
			vi.mocked(ConfigManager.Has).mockReturnValue(true)

			// Mock Zod validation for the reload process
			const parseSpy = mockZodValidation(planConfig)

			const res = await plan.Reload("test-plan", userToken)

			expect(Roles.CheckPermission).toHaveBeenCalled()
			expect(ConfigManager.Set).toHaveBeenCalledWith("plans.test-plan", expect.anything())
			expect(res.Body).toHaveProperty("message", "Plan reloaded")
			parseSpy.mockRestore()
		})

		it("should throw error if plan not found in config", async () => {
			vi.mocked(ConfigManager.Load).mockResolvedValue({ plans: {} } as any)
			vi.mocked(ConfigManager.Has).mockReturnValue(false)

			await expect(plan.Reload("missing", {} as any)).rejects.toThrow()
		})
	})

	describe("Process", () => {
		it("should execute steps in sequence", async () => {
			const steps = [{ "mock-cmd": { args: 1 } }]
			const mockDataTable = new DataTable()
			plan._data = mockDataTable
			plan.Config = { steps } as any

			seedPlanMetrics()
			Step.ExecuteCaseMap["mock-cmd"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))

			await plan.Process("s")

			expectValidMetrics(plan.Metrics, 1)
			expectValidStepEntry(plan.Metrics?.steps[0], 0, STEP_STATUS.SUCCESS)
		})

		describe("Failure Strategy", () => {
			it("should handle 'throw' strategy - stop execution and throw error", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable

				plan.Config = {
					steps,
					"failure-strategy": PLAN_FAILURE_STRATEGY.THROW,
				} as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))
				Step.ExecuteCaseMap["mock-cmd-2"] = vi.fn().mockRejectedValue(new Error("Test error for throw strategy"))
				Step.ExecuteCaseMap["mock-cmd-3"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))

				await expect(plan.Process("s")).rejects.toThrow("Test error for throw strategy")

				expect(plan.Metrics?.status).toBe(PLAN_STATUS.FAILED)
				expect(plan.Metrics?.startTime).toBeInstanceOf(Date)
				expect(plan.Metrics?.endTime).toBeInstanceOf(Date)
			})

			it("should handle 'data' strategy - return current data and stop", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }, { "mock-cmd-3": { args: 3 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable

				plan.Config = {
					steps,
					"failure-strategy": PLAN_FAILURE_STRATEGY.DATA,
				} as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))
				Step.ExecuteCaseMap["mock-cmd-2"] = vi.fn().mockRejectedValue(new Error("Test error for data strategy"))
				Step.ExecuteCaseMap["mock-cmd-3"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))

				const result = await plan.Process("s")

				expect(result).toBe(mockDataTable)
				expect(result.MetaData).toEqual({})

				expectValidMetrics(plan.Metrics, 3)
				expectValidStepEntry(plan.Metrics?.steps[0], 0, STEP_STATUS.SUCCESS)
				expect(plan.Metrics?.steps[1]).toBeUndefined()
				expectValidStepEntry(plan.Metrics?.steps[2], 2, STEP_STATUS.SUCCESS)
				expect(plan.Metrics?.status).toBe(PLAN_STATUS.COMPLETED_WITH_ERRORS)
			})

			it("should handle 'data-errors' strategy - collect errors and continue", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }, { "mock-cmd-3": { args: 3 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable

				plan.Config = {
					steps,
					"failure-strategy": PLAN_FAILURE_STRATEGY.DATA_ERRORS,
				} as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))
				Step.ExecuteCaseMap["mock-cmd-2"] = vi.fn().mockRejectedValue(new Error("First error for data-errors strategy"))
				Step.ExecuteCaseMap["mock-cmd-3"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))

				const result = await plan.Process("s")

				expect(result).toBe(mockDataTable)

				expect(result.MetaData[METADATA.PLAN_ERRORS]).toBeDefined()
				expect(result.MetaData[METADATA.PLAN_ERRORS] as any[]).toHaveLength(1)
				expect((result.MetaData[METADATA.PLAN_ERRORS] as any[])[0]).toMatchObject({
					step: 1,
					command: "mock-cmd-2",
					error: "First error for data-errors strategy",
					timestamp: expect.any(String),
				})

				expectValidMetrics(plan.Metrics, 3)
				expectValidStepEntry(plan.Metrics?.steps[0], 0, STEP_STATUS.SUCCESS)
				expect(plan.Metrics?.steps[1]).toBeUndefined()
				expectValidStepEntry(plan.Metrics?.steps[2], 2, STEP_STATUS.SUCCESS)
				expect(plan.Metrics?.status).toBe(PLAN_STATUS.COMPLETED_WITH_ERRORS)
			})

			it("should default to 'throw' strategy when none specified", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable

				plan.Config = {
					steps,
				} as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = vi.fn().mockRejectedValue(new Error("Test error for default strategy"))

				await expect(plan.Process("s")).rejects.toThrow("Test error for default strategy")

				expect(plan.Metrics?.status).toBe(PLAN_STATUS.FAILED)
				expect(plan.Metrics?.startTime).toBeInstanceOf(Date)
				expect(plan.Metrics?.endTime).toBeInstanceOf(Date)
			})
		})

		describe("Signal Handling", () => {
			it("should handle 'next' signal and continue execution", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				plan.Config = { steps } as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))
				Step.ExecuteCaseMap["mock-cmd-2"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))

				const result = await plan.Process("s")

				expect(result).toBe(mockDataTable)

				expectValidMetrics(plan.Metrics, 2)
				expectValidStepEntry(plan.Metrics?.steps[0], 0, STEP_STATUS.SUCCESS)
				expectValidStepEntry(plan.Metrics?.steps[1], 1, STEP_STATUS.SUCCESS)
			})

			it("should handle 'stop' signal and halt execution", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }, { "mock-cmd-3": { args: 3 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				plan.Config = { steps } as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))
				Step.ExecuteCaseMap["mock-cmd-2"] = Step.WrapStepWithSignal(
					vi.fn().mockResolvedValue(mockDataTable),
					undefined,
					STEP_SIGNAL.STOP,
				)
				Step.ExecuteCaseMap["mock-cmd-3"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))

				const result = await plan.Process("s")

				expect(result).toBe(mockDataTable)

				expectValidMetrics(plan.Metrics, 2)
				expectValidStepEntry(plan.Metrics?.steps[0], 0, STEP_STATUS.SUCCESS)
				expectValidStepEntry(plan.Metrics?.steps[1], 1, STEP_STATUS.SUCCESS)
			})

			it("should handle failed outcome with 'next' signal", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				plan.Config = { steps } as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))
				Step.ExecuteCaseMap["mock-cmd-2"] = Step.WrapStepWithSignal(vi.fn().mockRejectedValue(new Error("failed")))

				await expect(plan.Process("s")).rejects.toThrow()

				expect(plan.Metrics?.steps[0]?.step?.status).toBe(STEP_STATUS.SUCCESS)
				expect(plan.Metrics?.steps[1]?.step?.status).toBe(STEP_STATUS.FAILED)
			})

			it("should handle failed outcome with 'stop' signal", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				plan.Config = { steps } as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = Step.WrapStepWithSignal(vi.fn().mockResolvedValue(mockDataTable))
				Step.ExecuteCaseMap["mock-cmd-2"] = Step.WrapStepWithSignal(
					vi.fn().mockRejectedValue(new Error("failed")),
					undefined,
					STEP_SIGNAL.STOP,
				)

				await expect(plan.Process("s")).rejects.toThrow()

				expect(plan.Metrics?.steps[0]?.step?.status).toBe(STEP_STATUS.SUCCESS)
				expect(plan.Metrics?.steps[1]?.step?.status).toBe(STEP_STATUS.FAILED)
			})

			it("should handle error handling with signal wrapping", async () => {
				const steps = [
					{
						"mock-cmd": {
							args: 1,
							"on-error": { strategy: "skip" as const },
						},
					},
				]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				plan.Config = { steps } as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = Step.WrapStepWithSignal(vi.fn().mockRejectedValue(new Error("Test error")))

				await expect(plan.Process("s")).rejects.toThrow()

				expect(plan.Metrics?.steps[0]?.step?.status).toBe(STEP_STATUS.FAILED)
			})

			it("should merge plan-level error config with step when missing", async () => {
				const steps = [
					{
						"mock-cmd": {
							args: 1,
						},
					},
				]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable

				const planConfig = {
					steps,
					"on-error": { strategy: "retry" as const, retry: { attempts: 3, delay: 100 } },
				}

				const parseSpy = mockZodValidation(planConfig)
				plan.Config = planConfig as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = vi.fn().mockImplementation(async (stepParams: any, $context: any) => {
					expect(stepParams).toHaveProperty("on-error")
					expect(stepParams["on-error"]).toEqual({ strategy: "retry", retry: { attempts: 3, delay: 100 } })
					return {
						data: mockDataTable,
						signal: STEP_SIGNAL.NEXT,
						outcome: STEP_OUTCOME.SUCCESS,
						$context: $context as any,
					}
				})

				await plan.Process("s")

				expectValidMetrics(plan.Metrics, 0)
				parseSpy.mockRestore()
			})

			it("should not override step-level error config with plan-level", async () => {
				const steps = [
					{
						"mock-cmd": {
							args: 1,
							"on-error": { strategy: "skip" as const },
						},
					},
				]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable

				const planConfig = {
					steps,
					"on-error": { strategy: "retry" as const, retry: { attempts: 3, delay: 100 } },
				}

				const parseSpy = mockZodValidation(planConfig)
				plan.Config = planConfig as any

				seedPlanMetrics()
				Step.ExecuteCaseMap["mock-cmd"] = vi.fn().mockImplementation(async (stepParams: any, $context: any) => {
					expect(stepParams).toHaveProperty("on-error")
					expect(stepParams["on-error"]).toEqual({ strategy: "skip" })
					return {
						data: mockDataTable,
						signal: STEP_SIGNAL.NEXT,
						outcome: STEP_OUTCOME.SUCCESS,
						$context: $context as any,
					}
				})

				await plan.Process("s")

				expectValidMetrics(plan.Metrics, 0)
				parseSpy.mockRestore()
			})
		})
	})

	describe("Metrics Event Handlers", () => {
		beforeEach(() => {
			// PlanMetrics.Metrics.clear()
		})

		describe("PLAN_START event", () => {
			it("should initialize plan metrics on PLAN_START event", () => {
				// Arrange
				const planName = "test-plan"
				const startTime = new Date()
				PlanMetrics.Set(planName, {
					planName,
					startTime,
					status: PLAN_STATUS.RUNNING,
					steps: [],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_START, {
						data: {
							planName,
							startTime,
							status: PLAN_STATUS.RUNNING,
						},
					}),
				)

				// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics).toBeDefined()
				expect(metrics?.planName).toBe(planName)
				expect(metrics?.startTime).toEqual(startTime)
				expect(metrics?.status).toBe(PLAN_STATUS.RUNNING)
			})

			it("should merge existing plan metrics on PLAN_START event", () => {
				// Arrange
				const planName = "test-plan"
				const startTime = new Date()
				PlanMetrics.Set(planName, {
					planName,
					startTime: new Date("2024-01-01"),
					status: PLAN_STATUS.STOPPED,
					steps: [],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_START, {
						data: {
							planName,
							startTime,
							status: PLAN_STATUS.RUNNING,
						},
					}),
				)

				// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics).toBeDefined()
				expect(metrics?.startTime).toEqual(startTime)
				expect(metrics?.status).toBe(PLAN_STATUS.RUNNING)
			})
		})

		describe("PLAN_END event", () => {
			it("should finalize plan metrics on PLAN_END event", () => {
				// Arrange
				const planName = "test-plan"
				const startTime = new Date("2024-01-01T10:00:00.000Z")
				const endTime = new Date("2024-01-01T10:05:00.000Z")
				PlanMetrics.Set(planName, {
					planName,
					startTime,
					status: PLAN_STATUS.RUNNING,
					steps: [],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_END, {
						data: {
							planName,
							endTime,
							status: PLAN_STATUS.COMPLETED,
						},
					}),
				)

				// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics).toBeDefined()
				expect(metrics?.endTime).toEqual(endTime)
				expect(metrics?.durationMs).toBe(5 * 60 * 1000) // 5 minutes
				expect(metrics?.status).toBe(PLAN_STATUS.COMPLETED)
			})

			it("should calculate duration correctly on PLAN_END event", () => {
				// Arrange
				const planName = "test-plan"
				const startTime = new Date("2024-01-01T10:00:00.000Z")
				const endTime = new Date("2024-01-01T10:02:30.500Z")
				PlanMetrics.Set(planName, {
					planName,
					startTime,
					status: PLAN_STATUS.RUNNING,
					steps: [],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_END, {
						data: {
							planName,
							endTime,
							status: PLAN_STATUS.COMPLETED,
						},
					}),
				)

				// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics?.durationMs).toBe(150500) // 2 minutes 30.5 seconds
			})
		})

		describe("STEP_START event", () => {
			it("should initialize step metrics on STEP_START event", () => {
				// Arrange
				const planName = "test-plan"
				const stepIndex = 0
				const startTime = new Date()
				PlanMetrics.Set(planName, {
					planName,
					startTime: new Date(),
					status: PLAN_STATUS.RUNNING,
					steps: [],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_START, {
						data: {
							planName,
							index: stepIndex,
							step: { startTime },
							attemptCount: 1,
							rows: { input: 10 },
						},
					}),
				)

				// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics?.steps[stepIndex]).toBeDefined()
				expect(metrics!.steps[stepIndex]!.planName).toBe(planName)
				expect(metrics!.steps[stepIndex]!.index).toBe(stepIndex)
				expect(metrics!.steps[stepIndex]!.step?.startTime).toEqual(startTime)
				expect(metrics!.steps[stepIndex]!.attemptCount).toBe(1)
				expect(metrics!.steps[stepIndex]!.rows?.input).toBe(10)
			})

			it("should merge existing step metrics on STEP_START event", () => {
				// Arrange
				const planName = "test-plan"
				const stepIndex = 0
				const startTime = new Date()
				PlanMetrics.Set(planName, {
					planName,
					startTime: new Date(),
					status: PLAN_STATUS.RUNNING,
					steps: [{ planName, index: stepIndex, step: {}, rows: {} }],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_START, {
						data: {
							planName,
							index: stepIndex,
							step: { startTime },
							attemptCount: 2,
						},
					}),
				)

				// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics!.steps[stepIndex]!.attemptCount).toBe(2)
				expect(metrics!.steps[stepIndex]!.step?.startTime).toEqual(startTime)
			})
		})

		describe("STEP_END event", () => {
			it("should finalize step metrics on STEP_END event", () => {
				// Arrange
				const planName = "test-plan"
				const stepIndex = 0
				const startTime = new Date("2024-01-01T10:00:00.000Z")
				const endTime = new Date("2024-01-01T10:01:00.000Z")
				PlanMetrics.Set(planName, {
					planName,
					startTime: new Date(),
					status: PLAN_STATUS.RUNNING,
					steps: [
						{
							planName,
							index: stepIndex,
							step: { startTime },
							attemptCount: 1,
							rows: {},
						},
					],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_END, {
						data: {
							planName,
							index: stepIndex,
							step: { endTime, status: STEP_STATUS.SUCCESS },
						},
					}),
				)

				// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics!.steps[stepIndex]!.step?.endTime).toEqual(endTime)
				expect(metrics!.steps[stepIndex]!.step?.durationMs).toBe(60000) // 1 minute
				expect(metrics!.steps[stepIndex]!.step?.status).toBe(STEP_STATUS.SUCCESS)
			})

			it("should calculate step duration correctly on STEP_END event", () => {
				// Arrange
				const planName = "test-plan"
				const stepIndex = 0
				const startTime = new Date("2024-01-01T10:00:00.000Z")
				const endTime = new Date("2024-01-01T10:00:30.500Z")
				PlanMetrics.Set(planName, {
					planName,
					startTime: new Date(),
					status: PLAN_STATUS.RUNNING,
					steps: [
						{
							planName,
							index: stepIndex,
							step: { startTime },
							attemptCount: 1,
							rows: {},
						},
					],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_END, {
						data: {
							planName,
							index: stepIndex,
							step: { endTime, status: STEP_STATUS.FAILED },
						},
					}),
				)

				// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics!.steps[stepIndex]!.step?.durationMs).toBe(30500) // 30.5 seconds
				expect(metrics!.steps[stepIndex]!.step?.status).toBe(STEP_STATUS.FAILED)
			})

			it("should handle STEP_END event without existing step metrics", () => {
				// Arrange
				const planName = "test-plan"
				const stepIndex = 0
				PlanMetrics.Set(planName, {
					planName,
					startTime: new Date(),
					status: PLAN_STATUS.RUNNING,
					steps: [],
				})

				// Act - should not throw error
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_END, {
						data: {
							planName,
							index: stepIndex,
							step: { endTime: new Date(), status: STEP_STATUS.SUCCESS },
						},
					}),
				)

				// Assert - step metrics should remain empty since STEP_START wasn't called
				const metrics = PlanMetrics.Get(planName)
				expect(metrics?.steps[stepIndex]).toBeUndefined()
			})
		})

		describe("STEP_INC event", () => {
			it("should increment row metrics on STEP_INC event", () => {
				// Arrange
				const planName = "test-plan"
				const stepIndex = 0
				PlanMetrics.Set(planName, {
					planName,
					startTime: new Date(),
					status: PLAN_STATUS.RUNNING,
					steps: [
						{
							planName,
							index: stepIndex,
							step: {},
							attemptCount: 1,
							rows: { input: 10, passed: 8, skipped: 1, sunk: 0, failed: 1 },
						},
					],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
						data: {
							planName,
							index: stepIndex,
							rows: { passed: 2, sunk: 1 },
						},
					}),
				)

				// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics!.steps[stepIndex]!.rows?.input).toBe(10)
				expect(metrics!.steps[stepIndex]!.rows?.passed).toBe(2) // merge overwrites with event data
				expect(metrics!.steps[stepIndex]!.rows?.skipped).toBe(1)
				expect(metrics!.steps[stepIndex]!.rows?.sunk).toBe(1) // merge overwrites with event data
				expect(metrics!.steps[stepIndex]!.rows?.failed).toBe(1)
			})

			it("should handle multiple STEP_INC events", async () => {
				// Arrange
				const planName = "test-plan"
				const stepIndex = 0
				PlanMetrics.Set(planName, {
					planName,
					startTime: new Date(),
					status: PLAN_STATUS.RUNNING,
					steps: [
						{
							planName,
							index: stepIndex,
							step: {},
							attemptCount: 1,
							rows: { input: 10, passed: 0, skipped: 0, sunk: 0, failed: 0 },
						},
					],
				})

				// Act
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
						data: {
							planName,
							index: stepIndex,
							rows: { passed: 5 },
						},
					}),
				)
			PlanMetrics.Bus.dispatchEvent(
				new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
					data: {
						planName,
						index: stepIndex,
						rows: { passed: 3, failed: 2 },
					},
				}),
			)

			await new Promise(r => setTimeout(r, 0))

			// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics!.steps[stepIndex]!.rows?.passed).toBe(3) // last event overwrites
				expect(metrics!.steps[stepIndex]!.rows?.failed).toBe(2) // last event overwrites
			})

			it("should handle STEP_INC event without existing step metrics", () => {
				// Arrange
				const planName = "test-plan"
				const stepIndex = 0
				PlanMetrics.Set(planName, {
					planName,
					startTime: new Date(),
					status: PLAN_STATUS.RUNNING,
					steps: [],
				})

				// Act - should not throw error
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
						data: {
							planName,
							index: stepIndex,
							rows: { passed: 5 },
						},
					}),
				)

				// Assert - step metrics should remain empty since STEP_START wasn't called
				const metrics = PlanMetrics.Get(planName)
				expect(metrics?.steps[stepIndex]).toBeUndefined()
			})
		})

		describe("Integration Tests", () => {
			it("should handle complete metrics lifecycle for a plan with multiple steps", async () => {
				// Arrange
				const planName = "test-plan"
				const planStartTime = new Date("2024-01-01T10:00:00.000Z")

				// Initialize plan metrics
				PlanMetrics.Set(planName, {
					planName,
					startTime: planStartTime,
					status: PLAN_STATUS.RUNNING,
					steps: [],
				})

				// Act - Simulate plan execution
				// Plan start
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_START, {
						data: {
							planName,
							startTime: planStartTime,
							status: PLAN_STATUS.RUNNING,
						},
					}),
				)

				// Step 1 execution
				const step1StartTime = new Date("2024-01-01T10:00:01.000Z")
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_START, {
						data: {
							planName,
							index: 0,
							step: { startTime: step1StartTime },
							attemptCount: 1,
							rows: { input: 100 },
						},
					}),
				)
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
						data: {
							planName,
							index: 0,
							rows: { passed: 80, skipped: 10, failed: 10 },
						},
					}),
				)
				const step1EndTime = new Date("2024-01-01T10:00:05.000Z")
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_END, {
						data: {
							planName,
							index: 0,
							step: { endTime: step1EndTime, status: STEP_STATUS.SUCCESS },
						},
					}),
				)

				// Step 2 execution
				const step2StartTime = new Date("2024-01-01T10:00:06.000Z")
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_START, {
						data: {
							planName,
							index: 1,
							step: { startTime: step2StartTime },
							attemptCount: 1,
							rows: { input: 80 },
						},
					}),
				)
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
						data: {
							planName,
							index: 1,
							rows: { passed: 75, sunk: 5 },
						},
					}),
				)
				const step2EndTime = new Date("2024-01-01T10:00:10.000Z")
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_END, {
						data: {
							planName,
							index: 1,
							step: { endTime: step2EndTime, status: STEP_STATUS.SUCCESS },
						},
					}),
				)

			// Plan end
			const planEndTime = new Date("2024-01-01T10:00:15.000Z")
			PlanMetrics.Bus.dispatchEvent(
				new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_END, {
					data: {
						planName,
						endTime: planEndTime,
						status: PLAN_STATUS.COMPLETED,
					},
				}),
			)

			await new Promise(r => setTimeout(r, 0))

			// Assert
				const metrics = PlanMetrics.Get(planName)
				expect(metrics).toBeDefined()
				expect(metrics?.planName).toBe(planName)
				expect(metrics?.startTime).toEqual(planStartTime)
				expect(metrics?.endTime).toEqual(planEndTime)
				expect(metrics?.durationMs).toBe(15000) // 15 seconds
				expect(metrics?.status).toBe(PLAN_STATUS.COMPLETED)
				expect(metrics?.steps).toHaveLength(2)

				// Step 1 metrics
				expect(metrics!.steps[0]!.index).toBe(0)
				expect(metrics!.steps[0]!.step?.startTime).toEqual(step1StartTime)
				expect(metrics!.steps[0]!.step?.endTime).toEqual(step1EndTime)
				expect(metrics!.steps[0]!.step?.durationMs).toBe(4000) // 4 seconds
				expect(metrics!.steps[0]!.step?.status).toBe(STEP_STATUS.SUCCESS)
				expect(metrics!.steps[0]!.rows?.input).toBe(100)
				expect(metrics!.steps[0]!.rows?.passed).toBe(80)
				expect(metrics!.steps[0]!.rows?.skipped).toBe(10)
				expect(metrics!.steps[0]!.rows?.failed).toBe(10)

				// Step 2 metrics
				expect(metrics!.steps[1]!.index).toBe(1)
				expect(metrics!.steps[1]!.step?.startTime).toEqual(step2StartTime)
				expect(metrics!.steps[1]!.step?.endTime).toEqual(step2EndTime)
				expect(metrics!.steps[1]!.step?.durationMs).toBe(4000) // 4 seconds
				expect(metrics!.steps[1]!.step?.status).toBe(STEP_STATUS.SUCCESS)
				expect(metrics!.steps[1]!.rows?.input).toBe(80)
				expect(metrics!.steps[1]!.rows?.passed).toBe(75)
				expect(metrics!.steps[1]!.rows?.sunk).toBe(5)
			})
		})
	})
})
