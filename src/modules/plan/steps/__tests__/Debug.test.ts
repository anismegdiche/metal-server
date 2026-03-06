/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { Debug } from "../Debug"
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

describe("Debug", () => {
	it("should set debug metadata on datatable", async () => {
		const spyMetaDataSet = vi.spyOn(myPlanEntity1, "MetaDataSet")

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: "error",
		}

		const result = await Debug(step)

		expect(spyMetaDataSet).toHaveBeenCalledWith("__PLAN_ERRORS__", [])
		expect(result).toBe(myPlanEntity1)
		spyMetaDataSet.mockRestore()
	})

	// Mock DataTable methods for testing
	beforeEach(() => {
		vi.clearAllMocks()

		// Mock DataTable methods
		myPlanEntity1.MetaDataSet = vi.fn().mockReturnThis()
	})
})
