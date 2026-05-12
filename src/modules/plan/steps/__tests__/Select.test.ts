import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { HttpResponse } from "../../../core/HttpResponse"
import type { TContext } from "../../../sandbox/types/TContext"
import { Schema } from "../../../schema/Schema"
import type { TSchemaResponse } from "../../../schema/types/TSchemaResponse"
import { STEP_STATUS } from "../../@consts"
import { Plans } from "../../Plans"
import type { U__plans_plan_select_Params } from "../../types/U__plans_params"
import { Select } from "../Select"

// Mock setup

vi.mock("../../schema/Schema")
vi.mock("../Plans")

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

const myPlanEntity2 = new DataTable("myPlanEntity2", [
	{ country: "USA" },
	{ country: "France" },
	{ country: "Germany" },
])
await myPlanEntity2.RowsSet()

describe("Select", () => {
	beforeEach(async () => {
		vi.clearAllMocks()
		Plans.clear()
	}, 120_000)

	it("should return data from schema if schema and entity are given", async () => {
		const select = HttpResponse.Ok(<TSchemaResponse>{
			schema: "mySchema",
			entity: "mySchemaEntity1",
			status: 200,
			data: mySchemaEntity1,
		})

		const spySchemaSelect = vi.spyOn(Schema, "Select").mockResolvedValue(select)
		const spyIsSchemaResponse = vi.spyOn(Schema, "IsSchemaResponse").mockReturnValue(true)
		vi.spyOn(mySchemaEntity1, "Count").mockResolvedValue(3)

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

		const stepParams = <U__plans_plan_select_Params>{
			schema: "mySchema",
			entity: mySchemaEntity1.Name,
		}

		const result = await Select(stepParams, $context)

		expect(result).toBeInstanceOf(DataTable)
		expect(result.Name).toBe(mySchemaEntity1.Name)
		expect(result.GetFieldNames()).toEqual(mySchemaEntity1.GetFieldNames())
		spySchemaSelect.mockRestore()
		spyIsSchemaResponse.mockRestore()
	})

	it("should return current data if schema and entity are not given", async () => {
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

		const stepParams = <U__plans_plan_select_Params>{}

		const result = await Select(stepParams, $context)

		expect(result).toBeInstanceOf(DataTable)
		expect(result.Name).toBe(myPlanEntity1.Name)
		expect(result.GetFieldNames()).toEqual(myPlanEntity1.GetFieldNames())
	})

	it("should use current plan data when only entity is given (implementation falls back to plan select)", async () => {
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

		const stepParams = <U__plans_plan_select_Params>{
			entity: myPlanEntity2.Name,
		}

		const result = await Select(stepParams, $context)

		expect(result).toBeInstanceOf(DataTable)
		expect(result.Name).toBe(myPlanEntity1.Name)
	})

	it("should return plan data when only schema is given (falls back to plan select)", async () => {
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

		const stepParams = <U__plans_plan_select_Params>{
			schema: "mySchema",
		}

		const result = await Select(stepParams, $context)

		expect(result).toBeInstanceOf(DataTable)
		expect(result.Name).toBe(myPlanEntity1.Name)
	})

	it("should use current plan data when entity not found (implementation falls back to plan select)", async () => {
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

		const stepParams = <U__plans_plan_select_Params>{
			entity: "nonExistentEntity",
		}

		const result = await Select(stepParams, $context)

		expect(result).toBeInstanceOf(DataTable)
		expect(result.Name).toBe(myPlanEntity1.Name)
	})
})
