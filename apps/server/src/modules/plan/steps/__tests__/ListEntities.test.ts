import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { HttpResponse } from "../../../core/HttpResponse"
import type { TContext } from "../../../sandbox/types/TContext"
import { Schema } from "../../../schema/Schema"
import type { TSchemaResponse } from "../../../schema/types/TSchemaResponse"
import { DATA_ENTITY_TYPE } from "../../../source/@consts"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_list_entities_Params } from "../../types/U__plans_params"
import { ListEntities } from "../ListEntities"

// Mock setup

vi.mock("../../schema/Schema")
vi.mock("../../core/ConfigManager")

// Test data setup
const myPlanEntity1 = new DataTable("myPlanEntity1", [
	{ name: "David", age: 28 },
	{ name: "Eve", age: 32 },
	{ name: "Frank", age: 36 },
	{ name: "Grace", age: 40 },
	{ name: "Henry", age: 44 },
])
await myPlanEntity1.RowsSet()

const entitiesData = new DataTable("entities", [
	{ name: "entity1", type: DATA_ENTITY_TYPE.TABLE },
	{ name: "entity2", type: DATA_ENTITY_TYPE.VIEW },
])
await entitiesData.RowsSet()

describe("ListEntities", () => {
	it("should return schema entities when schema is provided", async () => {
		const spyListEntities = vi.spyOn(Schema, "ListEntities").mockResolvedValue(
			HttpResponse.Ok(<TSchemaResponse>{
				schema: "mySchema",
				status: 200,
				data: entitiesData,
			}),
		)
		const spyIsSchemaResponse = vi.spyOn(Schema, "IsSchemaResponse").mockReturnValue(true)

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

		const stepParams = <U__plans_plan_list_entities_Params>{ schema: "mySchema" }

		const result = await ListEntities(stepParams, $context)

		expect(spyListEntities).toHaveBeenCalledWith({ schema: "mySchema" })
		expect(result).toBe(entitiesData)
		spyListEntities.mockRestore()
		spyIsSchemaResponse.mockRestore()
	})
})
