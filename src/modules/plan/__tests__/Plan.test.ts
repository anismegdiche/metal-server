/** biome-ignore-all lint/suspicious/noExplicitAny: test usage */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../types/DataTable"
import { Roles } from "../../auth/Roles"
import { ConfigManager } from "../../core/ConfigManager"
import { Plan } from "../Plan"
import { Step } from "../Step"
import { z_U__plans_plan } from "../types/U__plans"

vi.mock("../../core/ConfigManager")
vi.mock("../../auth/Roles")
vi.mock("../../../utils/Logger", () => ({
	LOGGER_DEFAULT_LEVEL: "info",
	VERBOSITY: { DEBUG: "debug" },
	Logger: {
		LogFunction: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
		Info: vi.fn(),
		Error: vi.fn(),
		Warn: vi.fn(),
		Debug: vi.fn(),
		In: "",
		Out: "",
	},
}))

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
		WrapStepWithSignal: vi.fn((fn: any, signal: "next" | "stop" = "next") => {
			return async (stepParams: any, $context: any) => {
				try {
					const data = await fn(stepParams, $context)
					return {
						data,
						signal,
						outcome: "success" as const,
						$context: $context as any,
					}
				} catch (_error) {
					return {
						data: undefined,
						signal,
						outcome: "failed" as const,
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
	const mockZodValidation = (config: any) => {
		return vi.spyOn(z_U__plans_plan, 'parse').mockReturnValue(config as any)
	}

	beforeEach(async () => {
		vi.clearAllMocks()
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
		await expect(async () => await plan.ProcessSchemaRequest({ schema: "s", source: "s1" } as any)).rejects.toThrow()
	})

	it("should load plan with custom step commands using mocked validation", async () => {
		const customConfig = {
			steps: [
				{ custom_step_1: { param1: "value1" } },
				{ custom_step_2: { param2: 42 } },
				{ another_custom: null }
			]
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
			steps: [
				{ step1: { data: "test" } },
				{ step2: { nested: { prop: "value" } } },
				{ step3: null }
			],
			"on-error": {
				strategy: "custom_strategy" as any,
				scope: "custom_scope" as any
			},
			"failure-strategy": "custom_failure" as any
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
			// Set up plan configuration
			plan.Config = { steps } as any

			const executeMock = vi.fn().mockResolvedValue(mockDataTable)
			// Wrap the mock function to return T_StepResult
			const wrappedMock = vi.fn().mockImplementation(async (stepParams: any, $context: any) => {
				const result = await executeMock(stepParams, $context)
				return {
					data: result,
					signal: "next" as const,
					outcome: "success" as const,
					$context: $context as any,
				}
			})
			Step.ExecuteCaseMap["mock-cmd"] = wrappedMock

			await plan.Process("s")

			expect(wrappedMock).toHaveBeenCalled()
		})

		it("should stop execution when step fails (not break)", async () => {
			const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }, { "mock-cmd-3": { args: 3 } }]
			const mockDataTable = new DataTable()
			plan._data = mockDataTable
			// Set up plan configuration
			plan.Config = { steps } as any

			const executeMock1 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
				return {
					data: mockDataTable,
					signal: "next" as const,
					outcome: "success" as const,
					$context: $context as any,
				}
			})
			const executeMock2 = vi.fn().mockImplementation(async (_stepParams: any, _context: any) => {
				throw new Error("Test error")
			})
			const executeMock3 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
				return {
					data: mockDataTable,
					signal: "next" as const,
					outcome: "success" as const,
					$context: $context as any,
				}
			})

			// Mock WrapStepWithSignal to not catch errors when there's no on-error config
			vi.mocked(Step.WrapStepWithSignal).mockImplementation((fn: any) => fn)

			Step.ExecuteCaseMap["mock-cmd"] = executeMock1
			Step.ExecuteCaseMap["mock-cmd-2"] = executeMock2
			Step.ExecuteCaseMap["mock-cmd-3"] = executeMock3

			const result = await plan.Process("s")

			expect(executeMock1).toHaveBeenCalled()
			expect(executeMock2).toHaveBeenCalled()
			expect(executeMock3).not.toHaveBeenCalled()
			expect(result).toBe(mockDataTable)
		})

		it("should continue execution when break is encountered", async () => {
			const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }, { "mock-cmd-3": { args: 3 } }]
			const mockDataTable = new DataTable()
			plan._data = mockDataTable
			// Set up plan configuration
			plan.Config = { steps } as any

			const executeMock1 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
				return {
					data: mockDataTable,
					signal: "next" as const,
					outcome: "success" as const,
					$context: $context as any,
				}
			})
			const executeMock2 = vi.fn().mockImplementation(async (_stepParams: any, _context: any) => {
				return undefined
			})
			const executeMock3 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
				return {
					data: mockDataTable,
					signal: "next" as const,
					outcome: "success" as const,
					$context: $context as any,
				}
			})

			Step.ExecuteCaseMap["mock-cmd"] = executeMock1
			Step.ExecuteCaseMap["mock-cmd-2"] = executeMock2
			Step.ExecuteCaseMap["mock-cmd-3"] = executeMock3

			const result = await plan.Process("s")

			expect(executeMock1).toHaveBeenCalled()
			expect(executeMock2).toHaveBeenCalled()
			expect(executeMock3).not.toHaveBeenCalled()
			expect(result).toBe(mockDataTable)
		})

		describe("Signal Handling", () => {
			it("should handle 'next' signal and continue execution", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				plan.Config = { steps } as any

				const executeMock1 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
					return {
						data: mockDataTable,
						signal: "next" as const,
						outcome: "success" as const,
						$context: $context as any,
					}
				})
				const executeMock2 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
					return {
						data: mockDataTable,
						signal: "next" as const,
						outcome: "success" as const,
						$context: $context as any,
					}
				})

				Step.ExecuteCaseMap["mock-cmd"] = executeMock1
				Step.ExecuteCaseMap["mock-cmd-2"] = executeMock2

				const result = await plan.Process("s")

				expect(executeMock1).toHaveBeenCalled()
				expect(executeMock2).toHaveBeenCalled()
				expect(result).toBe(mockDataTable)
			})

			it("should handle 'stop' signal and halt execution", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }, { "mock-cmd-3": { args: 3 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				plan.Config = { steps } as any

				const executeMock1 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
					return {
						data: mockDataTable,
						signal: "next" as const,
						outcome: "success" as const,
						$context: $context as any,
					}
				})
				const executeMock2 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
					return {
						data: mockDataTable,
						signal: "stop" as const,
						outcome: "success" as const,
						$context: $context as any,
					}
				})
				const executeMock3 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
					return {
						data: mockDataTable,
						signal: "next" as const,
						outcome: "success" as const,
						$context: $context as any,
					}
				})

				Step.ExecuteCaseMap["mock-cmd"] = executeMock1
				Step.ExecuteCaseMap["mock-cmd-2"] = executeMock2
				Step.ExecuteCaseMap["mock-cmd-3"] = executeMock3

				const result = await plan.Process("s")

				expect(executeMock1).toHaveBeenCalled()
				expect(executeMock2).toHaveBeenCalled()
				expect(executeMock3).not.toHaveBeenCalled()
				expect(result).toBe(mockDataTable)
			})

			it("should handle failed outcome with 'next' signal", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				plan.Config = { steps } as any

				const executeMock1 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
					return {
						data: mockDataTable,
						signal: "next" as const,
						outcome: "success" as const,
						$context: $context as any,
					}
				})
				const executeMock2 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
					return {
						data: undefined,
						signal: "next" as const,
						outcome: "failed" as const,
						$context: $context as any,
					}
				})

				Step.ExecuteCaseMap["mock-cmd"] = executeMock1
				Step.ExecuteCaseMap["mock-cmd-2"] = executeMock2

				const result = await plan.Process("s")

				expect(executeMock1).toHaveBeenCalled()
				expect(executeMock2).toHaveBeenCalled()
				// Should continue even with failed outcome when signal is 'next'
				expect(result).toBe(mockDataTable)
			})

			it("should handle failed outcome with 'stop' signal", async () => {
				const steps = [{ "mock-cmd": { args: 1 } }, { "mock-cmd-2": { args: 2 } }]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				plan.Config = { steps } as any

				const executeMock1 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
					return {
						data: mockDataTable,
						signal: "next" as const,
						outcome: "success" as const,
						$context: $context as any,
					}
				})
				const executeMock2 = vi.fn().mockImplementation(async (_stepParams: any, $context: any) => {
					return {
						data: undefined,
						signal: "stop" as const,
						outcome: "failed" as const,
						$context: $context as any,
					}
				})

				Step.ExecuteCaseMap["mock-cmd"] = executeMock1
				Step.ExecuteCaseMap["mock-cmd-2"] = executeMock2

				const result = await plan.Process("s")

				expect(executeMock1).toHaveBeenCalled()
				expect(executeMock2).toHaveBeenCalled()
				expect(result).toBe(mockDataTable)
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

				const executeMock = vi.fn().mockImplementation(async (_stepParams: any, _$context: any) => {
					// This should be wrapped by WrapStepWithSignal which handles the error
					throw new Error("Test error")
				})

				// Create a wrapped function that simulates the error handling behavior
				const wrappedExecuteMock = vi.fn().mockImplementation(async (stepParams: any, $context: any) => {
					try {
						const result = await executeMock(stepParams, $context)
						return {
							data: result,
							signal: "next" as const,
							outcome: "success" as const,
							$context: $context as any,
						}
					} catch (error) {
						// Simulate the error handling in WrapStepWithSignal
						const onError = (stepParams as any)["on-error"]
						if (onError?.strategy === "skip") {
							return {
								data: undefined,
								signal: "next" as const,
								outcome: "failed" as const,
								$context: $context as any,
							}
						}
						throw error
					}
				})

				Step.ExecuteCaseMap["mock-cmd"] = wrappedExecuteMock

				const result = await plan.Process("s")

				expect(executeMock).toHaveBeenCalled()
				expect(wrappedExecuteMock).toHaveBeenCalled()
				// Should handle the error through the wrapped function
				expect(result).toBe(mockDataTable)
			})

			it("should merge plan-level error config with step when missing", async () => {
				const steps = [
					{
						"mock-cmd": {
							args: 1,
							// No on-error at step level
						},
					},
				]
				const mockDataTable = new DataTable()
				plan._data = mockDataTable
				
				const planConfig = {
					steps,
					"on-error": { strategy: "retry" as const, retry: { attempts: 3, delay: 100 } },
				}
				
				// Mock Zod validation to accept the config
				const parseSpy = mockZodValidation(planConfig)
				plan.Config = planConfig as any

				const executeMock = vi.fn().mockImplementation(async (stepParams: any, $context: any) => {
					// Verify that the step params now have the on-error config
					expect(stepParams).toHaveProperty("on-error")
					expect(stepParams["on-error"]).toEqual({ strategy: "retry", retry: { attempts: 3, delay: 100 } })
					return {
						data: mockDataTable,
						signal: "next" as const,
						outcome: "success" as const,
						$context: $context as any,
					}
				})

				Step.ExecuteCaseMap["mock-cmd"] = executeMock

				await plan.Process("s")

				expect(executeMock).toHaveBeenCalled()
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
				
				// Mock Zod validation to accept the config
				const parseSpy = mockZodValidation(planConfig)
				plan.Config = planConfig as any

				const executeMock = vi.fn().mockImplementation(async (stepParams: any, $context: any) => {
					// Verify that the step-level config is preserved
					expect(stepParams).toHaveProperty("on-error")
					expect(stepParams["on-error"]).toEqual({ strategy: "skip" })
					return {
						data: mockDataTable,
						signal: "next" as const,
						outcome: "success" as const,
						$context: $context as any,
					}
				})

				Step.ExecuteCaseMap["mock-cmd"] = executeMock

				await plan.Process("s")

				expect(executeMock).toHaveBeenCalled()
				parseSpy.mockRestore()
			})
		})
	})
})
