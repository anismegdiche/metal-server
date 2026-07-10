import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { DataTableUtils, JOIN_TYPE } from "../../../../utils/DataTableUtils"
import { HttpErrorInternalServerError } from "../../../errors/HttpErrors"
import type { TContext } from "../../../sandbox/types/TContext"
import { Schema } from "../../../schema/Schema"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_join_Params } from "../../types/U__plans_params"
import { Join } from "../Join"

// Mock setup

vi.mock("../../schema/Schema")

// Test data setup
const myPlanEntity1 = new DataTable("myPlanEntity1", [
	{ name: "David", age: 28 },
	{ name: "Eve", age: 32 },
	{ name: "Frank", age: 36 },
	{ name: "Grace", age: 40 },
	{ name: "Henry", age: 44 },
])
await myPlanEntity1.RowsSet()

const myPlanEntity2 = new DataTable("myPlanEntity2", [
	{ country: "USA" },
	{ country: "France" },
	{ country: "Germany" },
])
await myPlanEntity2.RowsSet()

describe("Join", () => {
	it("should perform left join with specified parameters", async () => {
		const spyLeftJoin = vi.spyOn(DataTableUtils, "LeftJoin").mockResolvedValue(myPlanEntity1)
		const mockResponse = {
			Body: {
				schema: "mySchema",
				entity: "myPlanEntity2",
				status: 200,
				data: myPlanEntity2,
			},
		}
		const spySchemaSelect = vi.spyOn(Schema, "Select").mockResolvedValue(mockResponse as any)
		vi.spyOn(Schema, "IsSchemaResponse").mockReturnValue(true)
		vi.spyOn(myPlanEntity2, "Count").mockResolvedValue(3)

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

		const stepParams = <U__plans_plan_join_Params>{
			type: JOIN_TYPE.LEFT,
			schema: "mySchema",
			entity: "myPlanEntity2",
			"left-field": "name",
			"right-field": "name",
		}

		const result = await Join(stepParams, $context)
		expect(spySchemaSelect).toHaveBeenCalled()
		expect(spyLeftJoin).toHaveBeenCalledWith(myPlanEntity1, myPlanEntity2, "name", "name")
		expect(result).toBe(myPlanEntity1)
		spyLeftJoin.mockRestore()
		spySchemaSelect.mockRestore()
	})

	it("should throw error for invalid join parameters", async () => {
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

		const stepParams = <U__plans_plan_join_Params>{
			type: "invalid-type" as any,
		}

		await expect(Join(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
	})
})
