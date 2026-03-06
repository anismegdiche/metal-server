/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { Break } from "../Break"
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

describe("Break", () => {
	it("should throw __BREAK__ error", async () => {
		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: null,
		}

		await expect(Break(step)).rejects.toThrow("__BREAK__")
	})
})
