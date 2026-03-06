/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { Omit } from "../Omit"
import type { TStep } from "../../types/TStep"

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

describe("Omit", () => {
	it("should call DataTable.Omit with arguments", async () => {
		const step = {
			currentDataTable: myPlanEntity1,
			stepArgs: ["f1"],
		}
		await Omit(step as any)
		expect(myPlanEntity1.Omit).toHaveBeenCalledWith(["f1"])
	})

	// Mock DataTable methods for testing
	beforeEach(() => {
		vi.clearAllMocks()

		// Mock DataTable methods
		myPlanEntity1.Omit = vi.fn().mockReturnThis()
	})
})
