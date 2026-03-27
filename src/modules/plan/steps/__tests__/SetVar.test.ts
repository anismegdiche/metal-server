/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: <explanation> */
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TContext } from "../../../../modules/sandbox/types/TContext"
import { DataTable } from "../../../../types/DataTable"
import { STEP_STATUS } from "../../@consts"

import type { U__plans_plan_set_var_Params } from "../../types/U__plans_params"
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
			$plan: {
				name: "test-plan",
				currentStep: {
					index: 0,
					command: undefined,
					params: {},
					status: STEP_STATUS.PENDING,
				},
				data: mockDataTable,
			},
		}
	})

	it("should set variables in context", async () => {
		const stepParams = <U__plans_plan_set_var_Params>{
			var1: "value1",
			var2: "${{ 1 + 1 }}",
		}

		await SetVar(stepParams, mockContext)

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

		const stepParams = <U__plans_plan_set_var_Params>{
			var1: "newValue",
			var2: "${{ 1 + 1 }}",
		}

		await SetVar(stepParams, mockContext)

		expect(mockContext.$vars).toEqual({
			existingVar: "existingValue",
			var1: "newValue",
			var2: 2,
		})
	})

	it("should initialize $vars if it does not exist", async () => {
		mockContext = {
			$vars: {},
			$plan: {
				name: "test-plan",
				currentStep: {
					index: 0,
					command: undefined,
					params: {},
					status: STEP_STATUS.PENDING,
				},
				data: mockDataTable,
			},
		}

		const stepParams = <U__plans_plan_set_var_Params>{
			var1: "value1",
		}

		await SetVar(stepParams, mockContext)

		expect(mockContext.$vars).toEqual({
			var1: "value1",
		})
	})

	it("should handle complex expressions", async () => {
		const stepParams = <U__plans_plan_set_var_Params>{
			stringExpr: "${{ test }}",
			numberExpr: "${{ 1 + 1 }}",
			plainString: "no evaluation",
			plainNumber: 42,
			plainObject: { key: "value" },
		}

		await SetVar(stepParams, mockContext)

		expect(mockContext.$vars).toEqual({
			stringExpr: undefined,
			numberExpr: 2,
			plainString: "no evaluation",
			plainNumber: 42,
			plainObject: { key: "value" },
		})
	})

	it("should validate variable names", async () => {
		const stepParams = <U__plans_plan_set_var_Params>{
			"valid-name": "value1",
			"123invalid": "value2",
			"invalid-name!": "value3",
			valid_name: "value4",
		}

		await expect(SetVar(stepParams, mockContext)).rejects.toThrow()
	})

	it("should not mutate other context namespaces", async () => {
		mockContext = {
			$vars: { existing: "value" },
			$plan: {
				name: "test-plan",
				currentStep: {
					index: 0,
					command: undefined,
					params: {},
					status: STEP_STATUS.PENDING,
				},
				data: mockDataTable,
			},
			$entity: "test-entity",
			$schema: "test-schema",
		}

		const stepParams = <U__plans_plan_set_var_Params>{
			newVar: "newValue",
		}

		await SetVar(stepParams, mockContext)

		expect(mockContext.$plan).toEqual({
			name: "test-plan",
			currentStep: { index: 0, command: undefined, params: {}, status: STEP_STATUS.PENDING },
			data: mockDataTable,
		})
		expect(mockContext.$entity).toBe("test-entity")
		expect(mockContext.$schema).toBe("test-schema")

		expect(mockContext.$vars).toEqual({
			existing: "value",
			newVar: "newValue",
		})
	})

	it("should throw error if context is missing", async () => {
		const stepParams = <U__plans_plan_set_var_Params>{ a: 1 }

		await expect(SetVar(stepParams, undefined as unknown as Partial<TContext>)).rejects.toThrow()
	})

	it("should throw error if stepArgs is invalid", async () => {
		const stepParams = "invalid-args" as unknown as U__plans_plan_set_var_Params

		await expect(SetVar(stepParams, mockContext)).rejects.toThrow()
	})

	it("should persist variables across multiple SetVar calls", async () => {
		const step1 = <U__plans_plan_set_var_Params>{
			var1: "value1",
			var2: "${{ 1 + 1 }}",
		}

		await SetVar(step1, mockContext)

		expect(mockContext.$vars).toEqual({
			var1: "value1",
			var2: 2,
		})

		const step2 = <U__plans_plan_set_var_Params>{
			var3: "value3",
			var1: "updated-value1",
		}

		await SetVar(step2, mockContext)

		expect(mockContext.$vars).toEqual({
			var1: "updated-value1",
			var2: 2,
			var3: "value3",
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
				currentStep: {
					index: 1,
					command: undefined,
					params: {},
					status: STEP_STATUS.RUNNING,
				},
				data: mockDataTable,
			},
		}
	})

	describe("Real-world variable workflow", () => {
		it("should maintain and evaluate variables across multiple steps", async () => {
			const setVar1Step = <U__plans_plan_set_var_Params>{
				var1: "active",
				threshold: 100,
			}

			await SetVar(setVar1Step, mockContext)

			expect(mockContext.$vars?.var1).toBe("active")
			expect(mockContext.$vars?.threshold).toBe(100)

			const setVar2Step = <U__plans_plan_set_var_Params>{
				var2: "${{ $vars.var1 === 'active' ? 'enabled' : 'disabled' }}",
				limit: "${{ $vars.threshold * 0.5 }}",
			}

			await SetVar(setVar2Step, mockContext)

			expect(mockContext.$vars?.var2).toBe("enabled")
			expect(mockContext.$vars?.limit).toBe(50)
		})
	})
})
