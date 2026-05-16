import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../types/DataTable"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP_ON_ERROR_RETRY_AFTER_RETRIES, STEP_ON_ERROR_RETRY_BACKOFF, STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY, STEP_SIGNAL, STEP_STATUS } from "../@consts"
import { Step } from "../Step"
import { STEP_OUTCOME } from "../@consts"
import type { U__on_error_Params } from "../types/U__plans_plan_on_error"

// Mock Utils.Sleep for testing retry delays
vi.mock("../../../utils/Utils", () => ({
	Utils: {
		Sleep: vi.fn().mockResolvedValue(undefined),
		Uuid: vi.fn((safe = false) => safe ? "testuuid123456789" : "test-uuid-123-456")
	}
}))

// Mock Insert for sink functionality
vi.mock("../steps/Insert", () => ({
	Insert: vi.fn().mockResolvedValue(undefined)
}))

describe("Step On-Error Functionality", () => {
	let mockContext: TContext
	let mockRow: { id: number; name: string }

	beforeEach(() => {
		vi.clearAllMocks()
		mockContext = <TContext>{
			$plan:
			{
				name: "test",
				data: new DataTable("test"),
				currentStep: {
					index: 0
				}
			}
		}
		mockRow = { id: 1, name: "test" }
	})

	describe("Step Scope Error Handling", () => {
		it("should handle step-level skip strategy", async () => {
			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.SKIP,
				scope: STEP_ON_ERROR_SCOPE.STEP
			}

			const stepFunction = vi.fn().mockRejectedValue(new Error("Step failed"))
			const stepParams = { test: "params" }

			const result = await Step.OnErrorStep({
				fnStep: stepFunction,
				stepParams,
				onError,
				$context: mockContext,
				attempt: 1
			})

			expect(result).toEqual(mockContext.$plan?.data)
		})

		it("should handle step-level throw strategy", async () => {
			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.THROW,
				scope: STEP_ON_ERROR_SCOPE.STEP
			}

			const stepFunction = vi.fn().mockRejectedValue(new Error("Step failed"))
			const stepParams = { test: "params" }

			await expect(Step.OnErrorStep({
				fnStep: stepFunction,
				stepParams,
				onError,
				$context: mockContext,
				attempt: 1
			})).rejects.toThrow()

			expect(stepFunction).toHaveBeenCalledWith(stepParams, mockContext)
		})

		it("should handle step-level retry strategy", async () => {
			const onError: U__on_error_Params = {
				scope: STEP_ON_ERROR_SCOPE.STEP,
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				retry: {
					attempts: 3,
					delay: 100,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					"max-delay": 1000,
					"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW
				}
			}

			const stepFunction = vi.fn().mockRejectedValue(new Error("Step failed"))
			const stepParams = { test: "params" }

			await expect(Step.OnErrorStep({
				fnStep: stepFunction,
				stepParams,
				onError,
				$context: mockContext,
				attempt: 1
			})).rejects.toThrow()

			expect(stepFunction).toHaveBeenCalledTimes(3)
		})
	})

	describe("Row Scope Error Handling", () => {
		it("should skip row when strategy is skip and scope is row", async () => {
			const onError: U__on_error_Params = {
				scope: STEP_ON_ERROR_SCOPE.ROW,
				strategy: STEP_ON_ERROR_STRATEGY.SKIP,
			}

			const mockRow2 = { id: 2, name: "test2" }
			const mockRow3 = { id: 3, name: "test3" }

			const resultRow2 = { id: 2 }
			const resultRow3 = { id: 3 }

			// fnRow should throw error for first row, but succeed for others
			const fnRow = vi.fn()
				.mockRejectedValueOnce(new Error("Row processing failed"))
				.mockResolvedValueOnce(resultRow2)
				.mockResolvedValueOnce(resultRow3)

			// Add test data to DataTable with 3 rows
			if (mockContext.$plan?.data) {
				await mockContext.$plan.data.RowsAdd([mockRow, mockRow2, mockRow3])
			}

			const result = await Step.OnErrorRow({
				fnRow,
				stepParams: {},
				onError,
				$context: mockContext,
				attempt: 1,
				error: new Error("Row processing failed")
			})

			expect(fnRow).toHaveBeenCalledTimes(3)

			const resultCount = await result?.data?.Count()
			expect(resultCount).equals(3)

			const resultRows = await result?.data?.Rows()
			expect(resultRows).toEqual([
				mockRow,
				resultRow2,
				resultRow3,
			])
		})

		it("should sink row error when strategy is sink and scope is row", async () => {
			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.SINK,
				scope: STEP_ON_ERROR_SCOPE.ROW,
				sink: {
					schema: "error_schema",
					entity: "error_entity",
					"include-error": true,
					"error-field": "error-details"
				}
			}

			const mockRow2 = { id: 2, name: "test2" }
			const mockRow3 = { id: 3, name: "test3" }

			const resultRow2 = { id: 2 }
			const resultRow3 = { id: 3 }

			const mockRows = [mockRow, mockRow2, mockRow3]

			// fnRow should throw error for first row, but succeed for others
			const fnRow = vi.fn()
				.mockRejectedValueOnce(new Error("Row processing failed"))
				.mockResolvedValueOnce(resultRow2)
				.mockResolvedValueOnce(resultRow3)

			// Add test data to DataTable with 3 rows
			if (mockContext.$plan?.data) {
				await mockContext.$plan.data.RowsSet(mockRows)
			}

			const result = await Step.OnErrorRow({
				fnRow,
				stepParams: {},
				onError,
				$context: mockContext,
				attempt: 1
			})

			const resultCount = await result?.data?.Count()

			expect(resultCount).toEqual(2)
			expect(fnRow).toHaveBeenCalledTimes(3)
			expect(fnRow).toHaveBeenNthCalledWith(1, expect.objectContaining(mockRow), {}, mockContext)
			expect(fnRow).toHaveBeenNthCalledWith(2, expect.objectContaining(mockRow2), {}, mockContext)
			expect(fnRow).toHaveBeenNthCalledWith(3, expect.objectContaining(mockRow3), {}, mockContext)
		})

		it("should retry row and succeed after attempts", async () => {
			const onError: U__on_error_Params = {
				scope: STEP_ON_ERROR_SCOPE.ROW,
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				retry: {
					attempts: 3,
					delay: 100,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					"max-delay": 1000,
					"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW
				}
			}

			const fnRow = vi.fn()
				.mockRejectedValueOnce(new Error("First attempt failed"))
				.mockRejectedValueOnce(new Error("Second attempt failed"))
				.mockResolvedValueOnce({ ...mockRow, processed: true })

			// Add test data to DataTable
			if (mockContext.$plan?.data) {
				await mockContext.$plan.data.RowsAdd(mockRow)
			}

			const result = await Step.OnErrorRow({
				fnRow,
				stepParams: {},
				onError,
				$context: mockContext,
				attempt: 1
			})

			// Should return DataTable (not undefined)
			expect(result?.data).toEqual(mockContext.$plan?.data)
			expect(fnRow).toHaveBeenCalledTimes(3)
		})

		it("should retry row and skip after exhausting attempts", async () => {
			const onError: U__on_error_Params = {
				scope: STEP_ON_ERROR_SCOPE.ROW,
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				retry: {
					attempts: 3,
					delay: 100,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					"max-delay": 1000,
					"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP
				}
			}

			const fnRow = vi.fn()
				.mockRejectedValueOnce(new Error("First attempt failed"))
				.mockRejectedValueOnce(new Error("Second attempt failed"))
				.mockRejectedValueOnce(new Error("Third attempt failed"))

			// Add test data to DataTable
			if (mockContext.$plan?.data) {
				await mockContext.$plan.data.RowsAdd(mockRow)
			}

			const result = await Step.OnErrorRow({
				fnRow,
				stepParams: {},
				onError,
				$context: mockContext,
				attempt: 1,
			})

			// Should return DataTable (not undefined)
			expect(result?.data).toEqual(mockContext.$plan?.data)
			expect(fnRow).toHaveBeenCalledTimes(3)
		})

		it("should retry row and sink after exhausting attempts", async () => {
			const onError: U__on_error_Params = {
				scope: STEP_ON_ERROR_SCOPE.ROW,
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				retry: {
					attempts: 3,
					delay: 100,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					"max-delay": 1000,
					"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.SINK
				},
				sink: {
					schema: "error_schema",
					entity: "error_entity",
					"include-error": true,
					"error-field": "error-details"
				}
			}

			const fnRow = vi.fn()
				.mockRejectedValueOnce(new Error("First attempt failed"))
				.mockRejectedValueOnce(new Error("Second attempt failed"))
				.mockRejectedValueOnce(new Error("Third attempt failed"))

			// Add test data to DataTable
			if (mockContext.$plan?.data) {
				await mockContext.$plan.data.RowsAdd(mockRow)
			}

			const result = await Step.OnErrorRow({
				fnRow,
				stepParams: {},
				onError,
				$context: mockContext,
				attempt: 1,
			})

			// Should return DataTable (not undefined)
			expect(result?.data).toEqual(mockContext.$plan?.data)
			expect(fnRow).toHaveBeenCalledTimes(3)
		})

		it("should count retry attempts correctly", async () => {
			const onError: U__on_error_Params = {
				scope: STEP_ON_ERROR_SCOPE.ROW,
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				retry: {
					attempts: 4,
					delay: 100,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					"max-delay": 1000,
					"after-retries": STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW
				}
			}

			const fnRow = vi.fn()
				.mockRejectedValueOnce(new Error("Attempt 1 failed"))
				.mockRejectedValueOnce(new Error("Attempt 2 failed"))
				.mockRejectedValueOnce(new Error("Attempt 3 failed"))
				.mockResolvedValueOnce({ ...mockRow, processed: true })

			// Add test data to DataTable
			if (mockContext.$plan?.data) {
				await mockContext.$plan.data.RowsAdd(mockRow)
			}

			const result = await Step.OnErrorRow({
				fnRow,
				stepParams: {},
				onError,
				$context: mockContext,
				attempt: 1,
			})

			// Should return DataTable (not undefined)
			expect(result?.data).toEqual(mockContext.$plan?.data)
			expect(fnRow).toHaveBeenCalledTimes(4)
		})
	})

	describe("WrapStepWithSignal Integration", () => {
		it("should work without error configuration", async () => {
			const mockData = new DataTable("test")
			const baseFunction = vi.fn().mockResolvedValue(mockData)
			const stepParams = { test: "params" }

			const wrappedFunction = Step.WrapStepWithSignal(baseFunction)
			const result = await wrappedFunction(stepParams, mockContext)

			expect(result).toEqual({
				data: mockData,
				signal: STEP_SIGNAL.NEXT,
				outcome: STEP_OUTCOME.SUCCESS,
				$context: mockContext,
				metrics: {
					attemptCount: expect.any(Number),
					rows: {
						input: expect.any(Number),
						passed: expect.any(Number),
						skipped: expect.any(Number),
						sunk: expect.any(Number),
						failed: expect.any(Number),
					},
					step: {
						startTime: expect.any(Date),
						endTime: expect.any(Date),
						durationMs: expect.any(Number),
						status: expect.any(String),
					},
				},
			})
			expect(baseFunction).toHaveBeenCalledWith(stepParams, mockContext)
		})

		it("should handle step-level errors and return failed outcome when no error handling", async () => {
			const baseFunction = vi.fn().mockRejectedValue(new Error("Step failed"))
			const stepParams = { test: "params" }

			const wrappedFunction = Step.WrapStepWithSignal(baseFunction)
			const result = await wrappedFunction(stepParams, mockContext)

			expect(result.outcome).toBe(STEP_OUTCOME.FAILED)
			expect(result.data).toBeUndefined()
			expect(baseFunction).toHaveBeenCalledWith(stepParams, mockContext)
		})

		it("should apply step-level error handling when configured", async () => {
			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.SKIP,
				scope: STEP_ON_ERROR_SCOPE.STEP
			}

			const baseFunction = vi.fn().mockRejectedValue(new Error("Step failed"))
			const stepParams = { "on-error": onError, test: "params" }

			const wrappedFunction = Step.WrapStepWithSignal(baseFunction)
			const result = await wrappedFunction(stepParams, mockContext)

			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)
			expect(result.data).toBeDefined()
		})

		it("should handle row-level error configuration at step level", async () => {
			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.SKIP,
				scope: STEP_ON_ERROR_SCOPE.ROW
			}

			const baseFunction = vi.fn().mockRejectedValue(new Error("Step failed"))
			const stepParams = { "on-error": onError, test: "params" }

			const wrappedFunction = Step.WrapStepWithSignal(baseFunction)
			const result = await wrappedFunction(stepParams, mockContext)

			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)
		})
	})

	describe("Retry Delay Calculation", () => {
		it("should calculate fixed delay correctly", () => {
			const delay = Step._calculateRetryDelay(2, 100, STEP_ON_ERROR_RETRY_BACKOFF.FIXED, 1000)
			expect(delay).toBe(100)
		})

		it("should calculate linear delay correctly", () => {
			const delay = Step._calculateRetryDelay(3, 100, STEP_ON_ERROR_RETRY_BACKOFF.LINEAR, 1000)
			expect(delay).toBe(300)
		})

		it("should calculate exponential delay correctly", () => {
			const delay = Step._calculateRetryDelay(3, 100, STEP_ON_ERROR_RETRY_BACKOFF.EXPONENTIAL, 1000)
			expect(delay).toBe(400)
		})

		it("should respect max delay limit", () => {
			const delay = Step._calculateRetryDelay(10, 100, STEP_ON_ERROR_RETRY_BACKOFF.EXPONENTIAL, 1000)
			expect(delay).toBe(1000)
		})
	})

	describe("Error Strategy Validation", () => {
		it("should handle default strategy gracefully", async () => {
			const stepFunction = vi.fn().mockResolvedValue(mockContext.$plan?.data)
			const stepParams = { test: "params" }

			const result = await Step.OnErrorStep({
				fnStep: stepFunction,
				stepParams,
				onError: undefined,
				$context: mockContext,
				attempt: 1
			})

			expect(result).toEqual(mockContext.$plan?.data)
			expect(stepFunction).toHaveBeenCalledWith(stepParams, mockContext)
		})
	})
})
