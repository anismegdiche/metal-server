import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_omit_Params } from "../../types/U__plans_params"
import { Omit } from "../Omit"

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

describe("Omit", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		myPlanEntity1.Omit = vi.fn().mockReturnThis()
	})

	it("should call DataTable.Omit with arguments", async () => {
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

		const stepParams = <U__plans_plan_omit_Params>{ fields: ["f1"] }

		await Omit(stepParams, $context)
		expect(myPlanEntity1.Omit).toHaveBeenCalledWith(["f1"])
	})
})
