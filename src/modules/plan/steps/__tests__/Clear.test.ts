import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import { Clear } from "../Clear"

// Mock setup
vi.mock("../../../utils/Logger", () => ({
	LOGGER_DEFAULT_LEVEL: "info",
	VERBOSITY: { DEBUG: "debug" },
	Logger: {
		LogFunction: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
		Info: vi.fn(),
		Error: vi.fn(),
		Debug: vi.fn(),
		In: "",
		Out: "",
	},
}))

// Test data setup
const myPlanEntity1 = new DataTable("myPlanEntity1", [
	{ name: "David", age: 28 },
	{ name: "Eve", age: 32 },
	{ name: "Frank", age: 36 },
	{ name: "Grace", age: 40 },
	{ name: "Henry", age: 44 },
])
await myPlanEntity1.RowsSet()

describe("Clear", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		myPlanEntity1.MetaDataSet = vi.fn().mockReturnThis()
	})

	it("should clear plan data and reset context", async () => {
		const $context: Partial<TContext> = {
			$schema: "mySchema",
			$entity: "myEntity",
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: myPlanEntity1,
			},
			$vars: { testVar: "testValue" },
			$row: { name: "test" },
			$response: { url: "test.com" },
		}

		const result = await Clear(null, $context)

		// Verify data is cleared
		expect(await result.Count()).toBe(0)

		// Verify context is reset
		expect($context.$vars).toEqual({})
		expect($context.$row).toBeUndefined()
		expect($context.$response).toBeUndefined()
		expect($context.$result).toBeUndefined()
		expect($context.$utils).toBeUndefined()
		expect($context.$error).toBeUndefined()
		expect($context.$request).toBeUndefined()
	})

	it("should handle empty context gracefully", async () => {
		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: myPlanEntity1,
			},
		}

		const result = await Clear(null, $context)

		expect(await result.Count()).toBe(0)
		expect($context.$vars).toEqual({})
	})
})
