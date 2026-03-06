import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TContext } from "../../../../modules/sandbox/types/TContext"
import { DataTable } from "../../../../types/DataTable"
import { STEP } from "../../@consts"
import type { TStep } from "../../types/TStep"
import type { U_config_plans_plan_entity_set_var_Params } from "../../types/U_config_plans_params"
import { SetVar } from "../SetVar"

// Mock Logger to avoid decorator issues
vi.mock("../../../../utils/Logger", () => ({
	LOGGER_DEFAULT_LEVEL: "warn",
	VERBOSITY: { DEBUG: "debug" },
	Logger: {
		LogFunction: () => (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
		Info: vi.fn(),
		Error: vi.fn(),
		Warn: vi.fn(),
		Debug: vi.fn(),
		In: "",
		Out: "",
	},
}))

describe("SetVar", () => {
	let mockDataTable: DataTable
	let mockContext: Partial<TContext>

	beforeEach(() => {
		mockDataTable = new DataTable()
		mockContext = {
			$vars: {},
		}
	})

	it("should set variables in context", async () => {
		const step: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: <U_config_plans_plan_entity_set_var_Params>{
				var1: "value1",
				var2: "${{ 1 + 1 }}",
			},
		}

		await SetVar(step, mockContext)

		expect(mockContext.$vars).toEqual({
			var1: "value1",
			var2: 2,
		})
	})

	it("should merge new variables without overwriting existing ones", async () => {
		mockContext.$vars = {
			existingVar: "existingValue",
			var1: "oldValue",
		}

		const step: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: <U_config_plans_plan_entity_set_var_Params>{
				var1: "newValue", // Should overwrite
				var2: "${{ 1 + 1 }}", // Should add
			},
		}

		await SetVar(step, mockContext)

		expect(mockContext.$vars).toEqual({
			existingVar: "existingValue", // Preserved
			var1: "newValue", // Overwritten
			var2: 2, // Added
		})
	})

	it("should initialize $vars if it does not exist", async () => {
		mockContext = {} // No $vars initially

		const step: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: <U_config_plans_plan_entity_set_var_Params>{
				var1: "value1",
			},
		}

		await SetVar(step, mockContext)

		expect(mockContext.$vars).toEqual({
			var1: "value1",
		})
	})

	it("should handle complex expressions", async () => {
		const step: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: <U_config_plans_plan_entity_set_var_Params>{
				stringExpr: "${{ test }}",
				numberExpr: "${{ 1 + 1 }}",
				plainString: "no evaluation",
				plainNumber: 42,
				plainObject: { key: "value" },
			},
		}

		await SetVar(step, mockContext)

		expect(mockContext.$vars).toEqual({
			stringExpr: undefined,
			numberExpr: 2,
			plainString: "no evaluation",
			plainNumber: 42,
			plainObject: { key: "value" },
		})
	})

	it("should validate variable names", async () => {
		const step: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: <U_config_plans_plan_entity_set_var_Params>{
				"valid-name": "value1",
				"123invalid": "value2", // Invalid: starts with number
				"invalid-name!": "value3", // Invalid: contains special character
				valid_name: "value4", // Valid
			},
		}

		await expect(SetVar(step, mockContext)).rejects.toThrow()
	})

	it("should not mutate other context namespaces", async () => {
		mockContext = {
			$vars: { existing: "value" },
			$plan: { name: "test-plan", entity: "myentity", $current: {} },
			$entity: "test-entity",
			$schema: "test-schema",
		}

		const step: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: <U_config_plans_plan_entity_set_var_Params>{
				newVar: "newValue",
			},
		}

		await SetVar(step, mockContext)

		expect(mockContext.$plan).toEqual({ name: "test-plan", entity: "myentity", $current: {} })
		expect(mockContext.$entity).toBe("test-entity")
		expect(mockContext.$schema).toBe("test-schema")

		// Only $vars should be modified
		expect(mockContext.$vars).toEqual({
			existing: "value",
			newVar: "newValue",
		})
	})

	it("should throw error if context is missing", async () => {
		const step: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: <U_config_plans_plan_entity_set_var_Params>{ a: 1 },
		}

		await expect(SetVar(step, undefined as unknown as Partial<TContext>)).rejects.toThrow()
	})

	it("should throw error if stepArgs is invalid", async () => {
		const step: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: "invalid-args" as unknown as U_config_plans_plan_entity_set_var_Params, // Not an object
		}

		await expect(SetVar(step, mockContext)).rejects.toThrow()
	})

	it("should persist variables across multiple SetVar calls", async () => {
		// First SetVar call
		const step1: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: <U_config_plans_plan_entity_set_var_Params>{
				var1: "value1",
				var2: "${{ 1 + 1 }}",
			},
		}

		await SetVar(step1, mockContext)

		expect(mockContext.$vars).toEqual({
			var1: "value1",
			var2: 2,
		})

		// Second SetVar call
		const step2: TStep = {
			currentSchemaName: "s1",
			currentPlanName: "p1",
			currentDataTable: mockDataTable,
			stepArgs: <U_config_plans_plan_entity_set_var_Params>{
				var3: "value3",
				var1: "updated-value1", // Update existing
			},
		}

		await SetVar(step2, mockContext)

		expect(mockContext.$vars).toEqual({
			var1: "updated-value1", // Updated
			var2: 2, // Preserved
			var3: "value3", // Added
		})
	})
})

describe("SetVar - $vars Usage Across Operations", () => {
	let mockDataTable: DataTable
	let mockContext: Partial<TContext>

	beforeEach(() => {
		mockDataTable = new DataTable()
		mockDataTable.Name = "test-table"

		mockContext = {
			$vars: {
				testVar: "test-value",
				counter: 42,
				filterCondition: "age > 25",
				updateField: "updated",
			},
			$plan: {
				name: "test-plan",
				entity: "test-entity",
				$current: {
					stepIndex: 1,
					stepCommand: STEP.SELECT,
					stepArgs: {},
					status: "running" as any,
					data: mockDataTable,
				},
			},
		}
	})

	describe("Real-world variable workflow", () => {
		it("should maintain and evaluate variables across multiple steps", async () => {
			// Step 1: Set var1
			const setVar1Step: TStep = {
				currentSchemaName: "s1",
				currentPlanName: "p1",
				currentDataTable: mockDataTable,
				stepArgs: <U_config_plans_plan_entity_set_var_Params>{
					var1: "active",
					threshold: 100,
				},
			}

			await SetVar(setVar1Step, mockContext)

			expect(mockContext.$vars?.var1).toBe("active")
			expect(mockContext.$vars?.threshold).toBe(100)

			// Step 2: Set var2 based on var1
			const setVar2Step: TStep = {
				currentSchemaName: "s1",
				currentPlanName: "p1",
				currentDataTable: mockDataTable,
				stepArgs: <U_config_plans_plan_entity_set_var_Params>{
					var2: "${{ $vars.var1 === 'active' ? 'enabled' : 'disabled' }}",
					limit: "${{ $vars.threshold * 0.5 }}",
				},
			}

			await SetVar(setVar2Step, mockContext)

			expect(mockContext.$vars?.var2).toBe("enabled")
			expect(mockContext.$vars?.limit).toBe(50)
		})
	})
})
