import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { AiEngine } from "../../../ai-engine/AiEngine"
import { HttpErrorInternalServerError } from "../../../errors/HttpErrors"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_run_Params } from "../../types/U__plans_params"
import { Run } from "../Run"

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

		const stepParams = <U__plans_plan_run_Params>{
			ai: "openai",
			input: "name",
			output: "summary",
			task: "sentiment-analysis",
		}

		const result = await Run(stepParams, $context)
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

		const stepParams = <U__plans_plan_run_Params>{}

		await expect(Run(stepParams, $context)).rejects.toThrow(HttpErrorInternalServerError)
	})
})
