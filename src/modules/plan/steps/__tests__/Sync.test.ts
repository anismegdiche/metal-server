/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { DataTableUtils } from "../../../../utils/DataTableUtils"
import { Schema } from "../../../schema/Schema"
import { Sync } from "../Sync"
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

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				from: {
					schema: "sourceSchema",
					entity: "sourceEntity",
				},
				to: {
					schema: "targetSchema",
					entity: "targetEntity",
				},
				id: "name",
			},
		}

		const result = await Sync(step)
		expect(spySchemaSelect).toHaveBeenCalled()
		expect(spyUpsert).toHaveBeenCalled()
		expect(result).toBe(myPlanEntity1)
		spySchemaSelect.mockRestore()
		spyUpsert.mockRestore()
	})

	it("should throw error for invalid sync parameters", async () => {
		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {} as any,
		}

		await expect(Sync(step)).rejects.toThrow(HttpErrorInternalServerError)
	})
})
