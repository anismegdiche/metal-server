import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { STEP } from "../../@consts"
import type { U__plans_plan_break_Params } from "../../types/U__plans_params"
import { Break } from "../Break"

// Mock setup
vi.mock("../../../utils/Logger", () => ({
	LOGGER_DEFAULT_LEVEL: "info",
	VERBOSITY: { DEBUG: "debug" },
	Logger: {
		LogFunction: () => (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
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

describe("Break", () => {
	it("should return undefined to signal break", async () => {
		const stepParams = null // Valid null for break parameters

		const result = await Break(stepParams)

		expect(result).toBeUndefined()
	})

	it("should validate step parameters", async () => {
		const stepParams = "invalid" // Invalid type

		// Should throw assertion error for invalid parameters
		await expect(Break(stepParams)).rejects.toThrow("Wrong argument passed")
	})
})
