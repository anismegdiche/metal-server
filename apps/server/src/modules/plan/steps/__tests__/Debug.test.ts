import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_debug_Params } from "../../types/U__plans_params"
import { Debug } from "../Debug"

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
	beforeEach(() => {
		vi.clearAllMocks()
		myPlanEntity1.MetaDataSet = vi.fn().mockReturnThis()
	})

	it("should set debug metadata on datatable", async () => {
		const spyMetaDataSet = vi.spyOn(myPlanEntity1, "MetaDataSet")

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

		const stepParams = <U__plans_plan_debug_Params>"error"

		const result = await Debug(stepParams, $context)

		expect(spyMetaDataSet).toHaveBeenCalledWith("__PLAN_ERRORS__", [])
		expect(result).toBe(myPlanEntity1)
		spyMetaDataSet.mockRestore()
	})
})
