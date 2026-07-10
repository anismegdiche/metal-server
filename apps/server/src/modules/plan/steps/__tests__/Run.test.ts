import { describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import { AiEngine } from "../../../ai-engine/AiEngine"
import { HttpErrorInternalServerError } from "../../../errors/HttpErrors"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_run_Params } from "../../types/U__plans_params"
import { Run } from "../Run"

// Mock setup

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
	beforeEach(() => {
		vi.clearAllMocks();   // mockClear() on every mock
		vi.resetAllMocks();   // mockReset() on every mock
		vi.restoreAllMocks(); // mockRestore() on every spy

		// Reset myPlanEntity1.Rows to its original state
		myPlanEntity1.Rows = myPlanEntity1.constructor.prototype.Rows
	})

	it("should use default AI task name when output is not specified", async () => {
		const mockAiEngine = {
			Run: vi.fn().mockResolvedValue({ result: "default output" }),
		}
		vi.spyOn(AiEngine.AiEnginesInstance, "get").mockReturnValue(mockAiEngine as any)

		const mockRowUpdateByIndex = vi.fn()
		myPlanEntity1.Rows = vi.fn().mockResolvedValue([
			{ __idx__: "row1", name: "David", age: 28, content: "Process data" }
		])
		myPlanEntity1.RowUpdateByIndex = mockRowUpdateByIndex
		myPlanEntity1.FieldsSet = vi.fn().mockResolvedValue(undefined)

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
			task: "text-generation",
		}

		await Run(stepParams, $context)

		expect(mockRowUpdateByIndex).toHaveBeenCalledWith("row1",
			expect.objectContaining({
				__idx__: "row1",
				name: "David",
				age: 28,
				content: "Process data",
				"openai-text-generation": { result: "default output" }
			})
		)
	})

	it("should execute AI engine with specified parameters", async () => {
		const mockAiEngine = {
			Run: vi.fn().mockResolvedValue({ result: "AI response" }),
		}
		const mockMap = new Map()
		mockMap.set("openai-default", mockAiEngine)
		vi.spyOn(AiEngine.AiEnginesInstance, "get").mockReturnValue(mockAiEngine as any)

		const mockDT = new DataTable("mockDT")

		mockDT.Rows = vi
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
				data: mockDT,
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
		// Reset all mocks to ensure isolation
		vi.restoreAllMocks()

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

	it("should correctly add AI response as string output to row", async () => {
		const mockAiEngine = {
			Run: vi.fn().mockResolvedValue({ sentiment: "positive", confidence: 0.95 }),
		}
		vi.spyOn(AiEngine.AiEnginesInstance, "get").mockReturnValue(mockAiEngine as any)

		const mockRowUpdateByIndex = vi.fn()
		myPlanEntity1.Rows = vi.fn().mockResolvedValue([
			{ __idx__: "row1", name: "David", age: 28, content: "Analyze sentiment" },
			{ __idx__: "row2", name: "Eve", age: 32, content: "Analyze sentiment" }
		])
		myPlanEntity1.RowUpdateByIndex = mockRowUpdateByIndex
		myPlanEntity1.FieldsSet = vi.fn().mockResolvedValue(undefined)


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
			output: "sentiment_result",
			task: "sentiment-analysis",
		}

		await Run(stepParams, $context)

		expect(mockRowUpdateByIndex).toHaveBeenCalledTimes(2)
		expect(mockRowUpdateByIndex).toHaveBeenCalledWith("row1",
			expect.objectContaining({
				__idx__: "row1",
				name: "David",
				age: 28,
				content: "Analyze sentiment",
				sentiment_result: { sentiment: "positive", confidence: 0.95 }
			})
		)
		expect(mockRowUpdateByIndex).toHaveBeenCalledWith("row2",
			expect.objectContaining({
				__idx__: "row2",
				name: "Eve",
				age: 32,
				content: "Analyze sentiment",
				sentiment_result: { sentiment: "positive", confidence: 0.95 }
			})
		)
	})

	it("should correctly map AI response using object output configuration", async () => {
		const mockAiEngine = {
			Run: vi.fn().mockResolvedValue({
				sentiment: "positive",
				confidence: 0.95,
				analysis: "very positive tone"
			}),
		}
		vi.spyOn(AiEngine.AiEnginesInstance, "get").mockReturnValue(mockAiEngine as any)

		const mockRowUpdateByIndex = vi.fn()
		myPlanEntity1.Rows = vi.fn().mockResolvedValue([
			{ __idx__: "row1", name: "David", age: 28, content: "Analyze sentiment" }
		])
		myPlanEntity1.RowUpdateByIndex = mockRowUpdateByIndex
		myPlanEntity1.FieldsSet = vi.fn().mockResolvedValue(undefined)

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
			output: {
				"sentiment_score": "sentiment",
				"confidence_level": "confidence"
			},
			task: "sentiment-analysis",
		}

		await Run(stepParams, $context)

		expect(mockRowUpdateByIndex).toHaveBeenCalledWith("row1",
			expect.objectContaining({
				__idx__: "row1",
				name: "David",
				age: 28,
				content: "Analyze sentiment",
				sentiment_score: "positive",
				confidence_level: 0.95
			})
		)
	})

	it("should return original row when AI response is empty", async () => {
		const mockAiEngine = {
			Run: vi.fn().mockResolvedValue({}),
		}
		vi.spyOn(AiEngine.AiEnginesInstance, "get").mockReturnValue(mockAiEngine as any)

		const mockRowUpdateByIndex = vi.fn()
		const originalRow = { __idx__: "row1", name: "David", age: 28, content: "Process data" }
		myPlanEntity1.Rows = vi.fn().mockResolvedValue([originalRow])
		myPlanEntity1.RowUpdateByIndex = mockRowUpdateByIndex
		myPlanEntity1.FieldsSet = vi.fn().mockResolvedValue(undefined)

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
			output: "result",
			task: "text-generation",
		}

		await Run(stepParams, $context)

		expect(mockRowUpdateByIndex).toHaveBeenCalledWith("row1", originalRow)
	})

	it("should handle JavaScript code evaluation in input", async () => {
		const mockAiEngine = {
			Run: vi.fn().mockResolvedValue({ result: "processed" }),
		}
		vi.spyOn(AiEngine.AiEnginesInstance, "get").mockReturnValue(mockAiEngine as any)

		const mockRowUpdateByIndex = vi.fn()
		myPlanEntity1.Rows = vi.fn().mockResolvedValue([
			{ __idx__: "row1", name: "David", age: 28, content: "Process data" }
		])
		myPlanEntity1.RowUpdateByIndex = mockRowUpdateByIndex
		myPlanEntity1.FieldsSet = vi.fn().mockResolvedValue(undefined)

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
			// biome-ignore lint/suspicious/noTemplateCurlyInString: ntal 
			input: "${{ $row.name + ' - ' + $row.age }}",
			output: "result",
			task: "text-generation",
		}

		await Run(stepParams, $context)

		expect(mockAiEngine.Run).toHaveBeenCalledWith({
			data: "David - 28",
			ai: "openai",
			input: "David - 28",
			output: "result",
			task: "text-generation",
		})
	})
})
