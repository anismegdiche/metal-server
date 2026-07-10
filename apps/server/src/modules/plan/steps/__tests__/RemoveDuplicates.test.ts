import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { DataTableUtils, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY } from "../../../../utils/DataTableUtils"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_remove_duplicates_Params } from "../../types/U__plans_params"
import { RemoveDuplicates } from "../RemoveDuplicates"

// Mock setup

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

		const stepParams = <U__plans_plan_remove_duplicates_Params>{}

		const result = await RemoveDuplicates(stepParams, $context)
		expect(result).toBe(await DataTableUtils.RemoveDuplicates(myPlanEntity1))
	})

	it("should remove duplicates with specified parameters", async () => {
		const spyRemoveDuplicates = vi.spyOn(DataTableUtils, "RemoveDuplicates").mockResolvedValue(myPlanEntity1)

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

		const stepParams = <U__plans_plan_remove_duplicates_Params>{
			key: ["name"],
			method: REMOVE_DUPLICATES_METHOD.HASH,
			strategy: REMOVE_DUPLICATES_STRATEGY.LAST,
		}

		const result = await RemoveDuplicates(stepParams, $context)
		expect(spyRemoveDuplicates).toHaveBeenCalledWith(myPlanEntity1, ["name"], "hash", "last", undefined)
		expect(result).toBe(myPlanEntity1)
		spyRemoveDuplicates.mockRestore()
	})
})
