import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TInternalResponse } from "../../../core/types/TInternalResponse"
import { HttpErrorInternalServerError } from "../../../errors/HttpErrors"
import type { TContext } from "../../../sandbox/types/TContext"
import { Schema } from "../../../schema/Schema"
import type { TSchemaResponse } from "../../../schema/types/TSchemaResponse"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_delete_Params } from "../../types/U__plans_params"
import { Delete } from "../Delete"

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

describe("Delete", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		myPlanEntity1.RowsDelete = vi.fn().mockReturnThis()
	})

	it("should delete data to schema when entity is provided", async () => {
		const spySchemaDelete = vi.spyOn(Schema, "Delete").mockResolvedValue(<TInternalResponse<TSchemaResponse>>(<unknown>{
			success: true,
			message: "Delete successful",
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

		const stepParams = <U__plans_plan_delete_Params>{
			schema: "mySchema",
			entity: "users",
			filter: { name: "John" },
		}

		const result = await Delete(stepParams, $context)
		expect(result).toBe(myPlanEntity1)
		spySchemaDelete.mockRestore()
	})

	it("should throw error if only entity was given", async () => {
		const spySchemaDelete = vi.spyOn(Schema, "Delete").mockResolvedValue(<TInternalResponse<TSchemaResponse>>(<unknown>{
			success: true,
			message: "Delete successful",
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

		const stepParams = <U__plans_plan_delete_Params>{
			entity: "users",
		}

		await expect(Delete(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
		spySchemaDelete.mockRestore()
	})

	it("should throw error if only schema was given", async () => {
		const spySchemaDelete = vi.spyOn(Schema, "Delete").mockResolvedValue(<TInternalResponse<TSchemaResponse>>(<unknown>{
			success: true,
			message: "Delete successful",
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

		const stepParams = <U__plans_plan_delete_Params>{
			schema: "mySchema",
		}

		await expect(Delete(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
		spySchemaDelete.mockRestore()
	})

	it("should delete current datatable when no schema and no entity", async () => {
		const output = await myPlanEntity1.RowsDelete("name = 'David'")

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

		const stepParams = <U__plans_plan_delete_Params>{
			filter: { name: "David" },
		}

		const result = await Delete(stepParams, $context)
		expect(result).toEqual(output)
	})

	it("should remove all data from plan when no args are given", async () => {
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

		const stepParams = <U__plans_plan_delete_Params>{}

		const result = await Delete(stepParams, $context)
		expect(result).toEqual(emptyDataTable)
	})
})
