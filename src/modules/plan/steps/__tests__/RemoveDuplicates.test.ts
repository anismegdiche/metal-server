/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import {
	DataTableUtils,
	REMOVE_DUPLICATES_METHOD,
	REMOVE_DUPLICATES_STRATEGY,
} from "../../../../utils/DataTableUtils"
import { RemoveDuplicates } from "../RemoveDuplicates"
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

describe("RemoveDuplicates", () => {
	it("should remove duplicates with default settings", async () => {
		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {},
		}

		const result = await RemoveDuplicates(step)
		expect(result).toBe(await DataTableUtils.RemoveDuplicates(myPlanEntity1))
	})

	it("should remove duplicates with specified parameters", async () => {
		const spyRemoveDuplicates = vi.spyOn(DataTableUtils, "RemoveDuplicates").mockResolvedValue(myPlanEntity1)

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				keys: ["name"],
				method: REMOVE_DUPLICATES_METHOD.HASH,
				strategy: REMOVE_DUPLICATES_STRATEGY.LAST,
			} as any,
		}

		const result = await RemoveDuplicates(step)
		expect(spyRemoveDuplicates).toHaveBeenCalledWith(myPlanEntity1, ["name"], "hash", "last", undefined)
		expect(result).toBe(myPlanEntity1)
		spyRemoveDuplicates.mockRestore()
	})
})
