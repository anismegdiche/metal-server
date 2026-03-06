/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { Schema } from "../../../schema/Schema"
import type { TSchemaResponse } from "../../../schema/types/TSchemaResponse"
import { ConfigManager } from "../../../core/ConfigManager"
import { HttpResponse } from "../../../core/HttpResponse"
import { DATA_ENTITY_TYPE } from "../../../source/@consts"
import { ListEntities } from "../ListEntities"
import type { TStep } from "../../types/TStep"

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

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: { schema: "mySchema" },
		}

		const result = await ListEntities(step)

		expect(spyListEntities).toHaveBeenCalledWith({ schema: "mySchema" })
		expect(result).toBe(entitiesData)
		spyListEntities.mockRestore()
		spyIsSchemaResponse.mockRestore()
	})

	it("should return plan entities when no schema provided", async () => {
		const spyConfigManagerGet = vi.spyOn(ConfigManager, "Get").mockReturnValue({
			entity1: {},
			entity2: {},
		})

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: null,
		}

		const result = await ListEntities(step)

		expect(spyConfigManagerGet).toHaveBeenCalledWith("plans.myPlan")
		expect(result).toBeInstanceOf(DataTable)
		expect(await result.Rows()).toEqual([
			{ name: "entity1", type: DATA_ENTITY_TYPE.PLAN_ENTITY },
			{ name: "entity2", type: DATA_ENTITY_TYPE.PLAN_ENTITY },
		])
		spyConfigManagerGet.mockRestore()
	})
})
