import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY, STEP_STATUS } from "../../@consts"
import type { U__plans_plan_map_Params } from "../../types/U__plans_params"
import { MapRows } from "../MapRows"

vi.mock("../../../../utils/Logger", () => ({
	LOGGER_DEFAULT_LEVEL: "debug",
	VERBOSITY: { DEBUG: "debug" },
	Logger: {
		LogFunction: () => (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
		Info: console.log,
		Error: console.error,
		Debug: console.log,
		In: "",
		Out: "",
	},
}))

vi.mock("../../Step", () => ({
	Step: {
		GetOnError: vi.fn((step: any) => {
			const params = step && Object.values(step)[0]
			return params?.["on-error"] ?? undefined
		}),
		OnErrorRow: vi.fn(),
	},
}))

const { Step } = await import("../../Step")

describe("Map step", () => {
	let testDataTable: DataTable

	beforeEach(() => {
		testDataTable = new DataTable("test", [
			{ price: 10, quantity: 2, category: "electronics" },
			{ price: 5, quantity: 3, category: "books" },
			{ price: 20, quantity: 1, category: "clothing" },
		])
		vi.clearAllMocks()
	})

	it("should transform data using custom JavaScript code", async () => {
		const $context: Partial<TContext> = {
			$schema: "test-schema",
			$plan: {
				name: "test-plan",
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testDataTable,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_map_Params>{
			script: `
                $row.total = $row.price * $row.quantity;
                $row.category = $row.category.toUpperCase();
                return $row;
            `,
		}

		const result = await MapRows(stepParams, $context)

		expect(result).toBeInstanceOf(DataTable)
		expect(result.Name).toBe("test_mapped")

		const rows = await result.Rows()
		expect(rows).toHaveLength(3)

		expect(rows[0]).toEqual({
			price: 10,
			quantity: 2,
			category: "ELECTRONICS",
			total: 20,
		})

		expect(rows[1]).toEqual({
			price: 5,
			quantity: 3,
			category: "BOOKS",
			total: 15,
		})

		expect(rows[2]).toEqual({
			price: 20,
			quantity: 1,
			category: "CLOTHING",
			total: 20,
		})
	})

	it("should return original row if script does not return anything", async () => {
		const $context: Partial<TContext> = {
			$schema: "test-schema",
			$plan: {
				name: "test-plan",
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testDataTable,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_map_Params>{
			script: `
                $row.processed = true;
                // No return statement
            `,
		}

		const result = await MapRows(stepParams, $context)
		const rows = await result.Rows()

		expect(rows[0]).toEqual({
			price: 10,
			quantity: 2,
			category: "electronics",
			processed: true,
		})
	})

	it("should handle empty data table", async () => {
		const emptyDataTable = new DataTable("empty", [])

		const $context: Partial<TContext> = {
			$schema: "test-schema",
			$plan: {
				name: "test-plan",
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: emptyDataTable,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_map_Params>{
			script: `
                $row.total = $row.price * $row.quantity;
                return $row;
            `,
		}

		const result = await MapRows(stepParams, $context)
		const rows = await result.Rows()

		expect(rows).toHaveLength(0)
	})

	it("should throw error by default when script fails", async () => {
		const $context: Partial<TContext> = {
			$schema: "test-schema",
			$plan: {
				name: "test-plan",
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testDataTable,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_map_Params>{
			script: `
                if ($row.category === 'books') {
                    throw new Error('Books are not allowed');
                }
                $row.processed = true;
                return $row;
            `,
		}

		await expect(MapRows(stepParams, $context)).rejects.toThrow()
	})

	it("should skip rows when using step scope with skip strategy", async () => {
		const $context: Partial<TContext> = {
			$schema: "test-schema",
			$plan: {
				name: "test-plan",
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testDataTable,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_map_Params>{
			script: `
                if ($row.category === 'books') {
                    throw new Error('Books are not allowed');
                }
                $row.processed = true;
                return $row;
            `,
			"on-error": {
				strategy: STEP_ON_ERROR_STRATEGY.SKIP,
				scope: STEP_ON_ERROR_SCOPE.STEP,
			},
		}

		const result = await MapRows(stepParams, $context)
		expect(result).toBeInstanceOf(DataTable)

		const rows = await result.Rows()
		expect(rows).toHaveLength(2)

		expect(rows[0]).toEqual({
			price: 10,
			quantity: 2,
			category: "electronics",
			processed: true,
		})

		expect(rows[1]).toEqual({
			price: 20,
			quantity: 1,
			category: "clothing",
			processed: true,
		})
	})
})
