/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { Pick } from "../Pick"

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

describe("Pick", () => {
	it("should call DataTable.Pick with arguments", async () => {
		const step = {
			currentDataTable: myPlanEntity1,
			stepArgs: ["f1", "f2"],
		}
		await Pick(step as any)
		expect(myPlanEntity1.Pick).toHaveBeenCalledWith(["f1", "f2"])
	})

	it("should return original table if *", async () => {
		const step = {
			currentDataTable: myPlanEntity1,
			stepArgs: ["*"],
		}
		const result = await Pick(step as any)
		expect(result).toBe(myPlanEntity1)
		expect(myPlanEntity1.Pick).not.toHaveBeenCalled()
	})

	// Mock DataTable methods for testing
	beforeEach(() => {
		vi.clearAllMocks()

		// Mock DataTable methods
		myPlanEntity1.Pick = vi.fn().mockReturnThis()
	})
})
