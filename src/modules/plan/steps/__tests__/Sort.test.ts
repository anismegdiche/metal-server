import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable, SORT_ORDER } from "../../../../types/DataTable"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_sort_Params } from "../../types/U__plans_params"
import { Sort } from "../Sort"

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

describe("Sort", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		myPlanEntity1.Sort = vi.fn().mockReturnThis()
	})

	it("should sort datatable by specified criteria", async () => {
		const spySort = vi.spyOn(myPlanEntity1, "Sort").mockResolvedValue(myPlanEntity1)

		const $context: Partial<TContext> = {
			$schema: "mySchema",
			$plan: {
				name: "myPlan",
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: myPlanEntity1,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_sort_Params>{ fields: { age: SORT_ORDER.ASC } }

		const result = await Sort(stepParams, $context)

		expect(spySort).toHaveBeenCalledWith({ age: SORT_ORDER.ASC })
		expect(result).toBe(myPlanEntity1)
		spySort.mockRestore()
	})
})
