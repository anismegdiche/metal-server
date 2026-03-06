/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { Schema } from "../../../schema/Schema"
import type { TSchemaResponse } from "../../../schema/types/TSchemaResponse"
import type { TInternalResponse } from "../../../core/types/TInternalResponse"
import { Insert } from "../Insert"
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

describe("Insert", () => {
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

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				schema: "mySchema",
				entity: mySchemaEntity1.Name,
				data: [{ name: "John", age: 25 }],
			},
		}

		const result = await Insert(step)

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

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				entity: "users",
			},
		}

		await expect(Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
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

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				schema: "mySchema",
			},
		}

		await expect(Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
		spySchemaInsert.mockRestore()
	})

	it("should add rows to current datatable when no schema and no entity", async () => {
		const spyRowsAdd = vi.spyOn(myPlanEntity1, "RowsAdd").mockResolvedValue(myPlanEntity1)

		const data = [{ name: "John", age: 25 }]

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				data,
			},
		}

		const result = await Insert(step)
		expect(result).toBe(await myPlanEntity1.RowsAdd(data))
		spyRowsAdd.mockRestore()
	})

	it("should throw error when no args are given", async () => {
		const emptyDataTable = new DataTable("empty", [])

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: emptyDataTable,
			stepArgs: {},
		}

		await expect(Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
	})

	it("should throw error when no data is given", async () => {
		const emptyDataTable = new DataTable("empty", [])

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: emptyDataTable,
			stepArgs: {
				schema: "mySchema",
				entity: mySchemaEntity1.Name,
			},
		}

		await expect(Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
	})

	// Mock DataTable methods for testing
	beforeEach(() => {
		vi.clearAllMocks()

		// Mock DataTable methods
		myPlanEntity1.RowsAdd = vi.fn().mockReturnThis()
	})
})
