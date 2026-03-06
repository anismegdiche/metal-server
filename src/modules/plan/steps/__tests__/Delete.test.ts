/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { Schema } from "../../../schema/Schema"
import type { TSchemaResponse } from "../../../schema/types/TSchemaResponse"
import type { TInternalResponse } from "../../../core/types/TInternalResponse"
import { Delete } from "../Delete"
import type { TStep } from "../../types/TStep"
import { HttpErrorInternalServerError } from "../../../errors/HttpErrors"

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

describe("Delete", () => {
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

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				schema: "mySchema",
				entity: "users",
				filter: { name: "John" },
			},
		}

		const result = await Delete(step)
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

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				entity: "users",
			},
		}

		await expect(Delete(step)).rejects.toThrow(HttpErrorInternalServerError)
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

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				schema: "mySchema",
			},
		}

		await expect(Delete(step)).rejects.toThrow(HttpErrorInternalServerError)
		spySchemaDelete.mockRestore()
	})

	it("should delete current datatable when no schema and no entity", async () => {
		const output = await myPlanEntity1.RowsDelete("name = 'David'")

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				filter: { name: "David" },
			},
		}

		const result = await Delete(step)
		expect(result).toEqual(output)
	})

	it("should remove all data from plan when no args are given", async () => {
		const emptyDataTable = new DataTable("empty", [])

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: emptyDataTable,
			stepArgs: {},
		}

		const result = await Delete(step)
		expect(result).toEqual(emptyDataTable)
	})

	// Mock DataTable methods for testing
	beforeEach(() => {
		vi.clearAllMocks()

		// Mock DataTable methods
		myPlanEntity1.RowsDelete = vi.fn().mockReturnThis()
	})
})
