import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TInternalResponse } from "../../../core/types/TInternalResponse"
import { HttpErrorInternalServerError } from "../../../errors/HttpErrors"
import type { TContext } from "../../../sandbox/types/TContext"
import { Schema } from "../../../schema/Schema"
import type { TSchemaResponse } from "../../../schema/types/TSchemaResponse"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_insert_Params } from "../../types/U__plans_params"
import { Insert } from "../Insert"

// Mock setup

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

describe("Insert", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		myPlanEntity1.RowsAdd = vi.fn().mockReturnThis()
	})

	it("should insert with schema, entity and data then return current datatable", async () => {
		const spySchemaInsert = vi.spyOn(Schema, "Insert").mockResolvedValue(<TInternalResponse<TSchemaResponse>>(<unknown>{
			success: true,
			message: "Insert successful",
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

		const stepParams = <U__plans_plan_insert_Params>{
			schema: "mySchema",
			entity: mySchemaEntity1.Name,
			data: [{ name: "John", age: 25 }],
		}

		const result = await Insert(stepParams, $context)

		expect(result).toBe(myPlanEntity1)
		spySchemaInsert.mockRestore()
	})

	it("should throw error if only entity was given", async () => {
		const spySchemaInsert = vi.spyOn(Schema, "Insert").mockResolvedValue(<TInternalResponse<TSchemaResponse>>(<unknown>{
			success: true,
			message: "Insert successful",
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

		const stepParams = <U__plans_plan_insert_Params>{
			entity: "users",
		}

		await expect(Insert(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
		spySchemaInsert.mockRestore()
	})

	it("should throw error if only schema was given", async () => {
		const spySchemaInsert = vi.spyOn(Schema, "Insert").mockResolvedValue(<TInternalResponse<TSchemaResponse>>(<unknown>{
			success: true,
			message: "Insert successful",
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

		const stepParams = <U__plans_plan_insert_Params>{
			schema: "mySchema",
		}

		await expect(Insert(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
		spySchemaInsert.mockRestore()
	})

	it("should add rows to current datatable when no schema and no entity", async () => {
		const spyRowsAdd = vi.spyOn(myPlanEntity1, "RowsAdd").mockResolvedValue(myPlanEntity1)

		const data = [{ name: "John", age: 25 }]

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

		const stepParams = <U__plans_plan_insert_Params>{
			data,
		}

		const result = await Insert(stepParams, $context)
		expect(result).toBe(await myPlanEntity1.RowsAdd(data))
		spyRowsAdd.mockRestore()
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

		const stepParams = <U__plans_plan_insert_Params>{}

		await expect(Insert(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
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

		const stepParams = <U__plans_plan_insert_Params>{
			schema: "mySchema",
			entity: mySchemaEntity1.Name,
		}

		await expect(Insert(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
	})
})
