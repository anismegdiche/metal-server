
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { DataTableUtils } from "../../../../utils/DataTableUtils"

import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_anonymize_Params } from "../../types/U__plans_params"
import { Anonymize } from "../Anonymize"

// Test data setup
const myPlanEntity1 = new DataTable("myPlanEntity1", [
	{ name: "David", age: 28 },
	{ name: "Eve", age: 32 },
	{ name: "Frank", age: 36 },
	{ name: "Grace", age: 40 },
	{ name: "Henry", age: 44 },
])
await myPlanEntity1.RowsSet()

describe("Anonymize", () => {
	it("should anonymize specified fields", async () => {
		const spyAnonymize = vi.spyOn(DataTableUtils, "Anonymize").mockResolvedValue(myPlanEntity1)

		let $context: Partial<TContext> = {
			$schema: "mySchema",
			$plan: {
				name: "myPlan",
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING
				},
				data: myPlanEntity1,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_anonymize_Params>{
			fields: ["name"]
		}

		const result = await Anonymize(stepParams, $context)

		expect(spyAnonymize).toHaveBeenCalledWith(myPlanEntity1, ["name"])
		expect(result).toBe(myPlanEntity1)
		spyAnonymize.mockRestore()
	})
})
