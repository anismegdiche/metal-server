import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { DataTableUtils } from "../../../../utils/DataTableUtils"
import { HttpErrorInternalServerError } from "../../../errors/HttpErrors"
import type { TContext } from "../../../sandbox/types/TContext"
import { Schema } from "../../../schema/Schema"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_sync_Params } from "../../types/U__plans_params"
import { Sync } from "../Sync"

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

describe("Sync", () => {
	it("should sync data between schema entities", async () => {
		const mockResponse = {
			Body: {
				schema: "sourceSchema",
				entity: "sourceEntity",
				status: 200,
				data: myPlanEntity1,
			},
		}
		const spySchemaSelect = vi.spyOn(Schema, "Select").mockResolvedValue(mockResponse as any)
		vi.spyOn(Schema, "IsSchemaResponse").mockReturnValue(true)
		vi.spyOn(myPlanEntity1, "Count").mockResolvedValue(3)
		myPlanEntity1.Rows = vi.fn().mockResolvedValue([{ name: "David", age: 28 }])
		const spyUpsert = vi.spyOn(DataTableUtils, "SyncReport" as any).mockResolvedValue({
			UpdatedRows: [],
			InsertedRows: [],
			DeletedRows: [],
			AddedRows: [],
		})

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

		const stepParams = <U__plans_plan_sync_Params>{
			from: {
				schema: "sourceSchema",
				entity: "sourceEntity",
			},
			to: {
				schema: "targetSchema",
				entity: "targetEntity",
			},
			id: "name",
		}

		const result = await Sync(stepParams, $context)
		expect(spySchemaSelect).toHaveBeenCalled()
		expect(spyUpsert).toHaveBeenCalled()
		expect(result).toBe(myPlanEntity1)
		spySchemaSelect.mockRestore()
		spyUpsert.mockRestore()
	})

	it("should throw error for invalid sync parameters", async () => {
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

		const stepParams = <U__plans_plan_sync_Params>{}

		await expect(Sync(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
	})
})
