import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TInternalResponse } from "../../../core/types/TInternalResponse"
import { HttpErrorInternalServerError } from "../../../errors/HttpErrors"
import type { TContext } from "../../../sandbox/types/TContext"
import { Schema } from "../../../schema/Schema"
import type { TSchemaResponse } from "../../../schema/types/TSchemaResponse"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_update_Params } from "../../types/U__plans_params"
import { Update } from "../Update"

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
const mySchemaEntity1 = new DataTable("mySchemaEntity1", [
	{ name: "Alice", age: 25, country: "USA" },
	{ name: "Bob", age: 30, country: "France" },
	{ name: "Charlie", age: 35, country: "Germany" },
])
await mySchemaEntity1.RowsSet()

const myPlanEntity1 = new DataTable("myPlanEntity1", [
	{ name: "David", age: 28 },
	{ name: "Eve", age: 32 },
	{ name: "Frank", age: 36 },
	{ name: "Grace", age: 40 },
	{ name: "Henry", age: 44 },
])
await myPlanEntity1.RowsSet()

describe("Update", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		myPlanEntity1.FreeSql = vi.fn().mockResolvedValue(myPlanEntity1)
	})

	it("should update data to schema when entity is provided", async () => {
		const spySchemaUpdate = vi.spyOn(Schema, "Update").mockResolvedValue(<TInternalResponse<TSchemaResponse>>(<unknown>{
			success: true,
			message: "Update successful",
			data: {
				success: true,
				message: "Success",
				data: mySchemaEntity1,
			},
		}))

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

		const stepParams = <U__plans_plan_update_Params>{
			schema: "mySchema",
			entity: "users",
			data: [{ age: 30 }],
			filter: { name: "John" },
		}

		const result = await Update(stepParams, $context)
		expect(result).toBe(myPlanEntity1)
		spySchemaUpdate.mockRestore()
	})

	it("should throw error if only entity was given", async () => {
		const spySchemaUpdate = vi.spyOn(Schema, "Update").mockResolvedValue(<TInternalResponse<TSchemaResponse>>(<unknown>{
			success: true,
			message: "Update successful",
			data: {
				success: true,
				message: "Success",
				data: mySchemaEntity1,
			},
		}))

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

		const stepParams = <U__plans_plan_update_Params>{
			entity: "users",
		}

		await expect(Update(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
		spySchemaUpdate.mockRestore()
	})

	it("should throw error if only schema was given", async () => {
		const spySchemaUpdate = vi.spyOn(Schema, "Update").mockResolvedValue(<TInternalResponse<TSchemaResponse>>(<unknown>{
			success: true,
			message: "Update successful",
			data: {
				success: true,
				message: "Success",
				data: mySchemaEntity1,
			},
		}))

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

		const stepParams = <U__plans_plan_update_Params>{
			schema: "mySchema",
		}

		await expect(Update(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
		spySchemaUpdate.mockRestore()
	})

	it("should update current datatable when no schema and no entity", async () => {
		const output = await myPlanEntity1.FreeSql({
			sqlQuery: `UPDATE [${myPlanEntity1.Name}] SET age = 25, country = 'France' WHERE name = 'David'`,
			queryParams: [{ name: "David", age: 25, country: "France" }],
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

		const stepParams = <U__plans_plan_update_Params>{
			data: [{ name: "David", age: 25, country: "France" }],
			filter: { name: "David" },
		}

		const result = await Update(stepParams, $context)
		expect(result).toEqual(output)
	})

	it("should throw error when no args are given", async () => {
		const emptyDataTable = new DataTable("empty", [])

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
				data: emptyDataTable,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_update_Params>{}

		await expect(Update(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
	})

	it("should throw error when no data is given", async () => {
		const emptyDataTable = new DataTable("empty", [])

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
				data: emptyDataTable,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_update_Params>{
			schema: "mySchema",
			entity: mySchemaEntity1.Name,
		}

		await expect(Update(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
	})
})
