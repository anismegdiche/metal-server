/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { AiEngine } from "../../../ai-engine/AiEngine"
import { Run } from "../Run"
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

// Test data setup
const myPlanEntity1 = new DataTable("myPlanEntity1", [
	{ name: "David", age: 28 },
	{ name: "Eve", age: 32 },
	{ name: "Frank", age: 36 },
	{ name: "Grace", age: 40 },
	{ name: "Henry", age: 44 },
])
await myPlanEntity1.RowsSet()

describe("Run", () => {
	it("should execute AI engine with specified parameters", async () => {
		const mockAiEngine = {
			Run: vi.fn().mockResolvedValue({ result: "AI response" }),
		}
		const mockMap = new Map()
		mockMap.set("openai-default", mockAiEngine)
		vi.spyOn(AiEngine.AiEnginesInstance, "get").mockReturnValue(mockAiEngine as any)
		myPlanEntity1.Rows = vi
			.fn()
			.mockResolvedValue([{ __idx__: "test-id", name: "David", age: 28, content: "Generate summary" }])

		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {
				ai: "openai",
				input: "name",
				output: "summary",
				task: "sentiment-analysis",
			} as any,
		}

		const result = await Run(step)
		expect(mockAiEngine.Run).toHaveBeenCalledWith({
			data: "David",
			ai: "openai",
			input: "name",
			output: "summary",
			task: "sentiment-analysis",
		})
		expect(result).toBeInstanceOf(DataTable)
	})

	it("should throw error for invalid run parameters", async () => {
		const step: TStep = {
			currentSchemaName: "mySchema",
			currentPlanName: "myPlan",
			currentDataTable: myPlanEntity1,
			stepArgs: {} as any,
		}

		await expect(Run(step)).rejects.toThrow(HttpErrorInternalServerError)
	})
})
