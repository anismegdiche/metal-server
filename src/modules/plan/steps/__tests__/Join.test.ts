/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import {
	DataTableUtils,
	JOIN_TYPE,
} from "../../../../utils/DataTableUtils"
import { Schema } from "../../../schema/Schema"
import type { TSchemaResponse } from "../../../schema/types/TSchemaResponse"
import { HttpResponse } from "../../../core/HttpResponse"
import { Join } from "../Join"
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

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				type: JOIN_TYPE.LEFT,
				schema: "mySchema",
				entity: "myPlanEntity2",
				"left-field": "name",
				"right-field": "name",
			},
		}

		const result = await Join(step)
		expect(spySchemaSelect).toHaveBeenCalled()
		expect(spyLeftJoin).toHaveBeenCalledWith(myPlanEntity1, myPlanEntity2, "name", "name")
		expect(result).toBe(myPlanEntity1)
		spyLeftJoin.mockRestore()
		spySchemaSelect.mockRestore()
	})

	it("should throw error for invalid join parameters", async () => {
		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				type: "invalid-type" as any,
			},
		}

		await expect(Join(step)).rejects.toThrow(HttpErrorInternalServerError)
	})
})
