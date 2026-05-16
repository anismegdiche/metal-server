//
//
//
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataTable } from '../../../types/DataTable'
import type { TContext } from '../../sandbox/types/TContext'
import { STEP, STEP_ON_ERROR_RETRY_AFTER_RETRIES, STEP_ON_ERROR_RETRY_BACKOFF, STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY, STEP_OUTCOME } from '../@consts'
import { Step } from '../Step'
import type { U__on_error_Params } from '../types/U__plans_plan_on_error'

vi.mock('../steps/Insert', () => ({
	Insert: vi.fn().mockResolvedValue(undefined)
}))


// Mock DataTable methods
const mockDataTable = {
	Count: vi.fn(),
	RowsMap: vi.fn(),
	GetDeletedRowsCount: vi.fn(() => 0),
	CleanForDeletion: vi.fn(() => mockDataTable),
	RowMarkForDeletion: vi.fn(),
} as unknown as DataTable

describe('Step Metrics Error Handling', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Step Scope Error Handling', () => {
		it('should track metrics for throw strategy at step scope', async () => {
			// Arrange
			const error = new Error('Test error')
			const mockStepFn = vi.fn().mockRejectedValue(error)

			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.THROW,
				scope: STEP_ON_ERROR_SCOPE.STEP
			}

			const stepParams = {
				'on-error': onError,
				test: 'param'
			}
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}
			mockDataTable.Count = vi.fn().mockResolvedValue(5)

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result.outcome).toBe(STEP_OUTCOME.FAILED)
			expect(result.error).toBeDefined()
			expect(result.metrics).toBeDefined()
			expect(result.metrics?.step.status).toBe('failed')
			expect(result.metrics?.attemptCount).toBe(1)
		})

		it('should track metrics for skip strategy at step scope', async () => {
			// Arrange
			const error = new Error('Test error')
			const mockStepFn = vi.fn().mockRejectedValue(error)

			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.SKIP,
				scope: STEP_ON_ERROR_SCOPE.STEP
			}

			const stepParams = {
				'on-error': onError,
				test: 'param'
			}
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}
			mockDataTable.Count = vi.fn().mockResolvedValue(5)

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS) // Skip strategy results in success
			expect(result.data).toBe(mockDataTable)
			expect(result.metrics).toBeDefined()

			const metrics = result.metrics
			expect(metrics.step.status).toBe('success')
			expect(metrics.attemptCount).toBe(1)
			expect(metrics.rows.input).toBe(5)
			expect(metrics.rows.passed).toBe(5)
		})

		it('should track metrics for retry strategy at step scope', async () => {
			// Arrange
			const error = new Error('Test error')
			const mockStepFn = vi.fn()
				.mockRejectedValueOnce(error)
				.mockRejectedValueOnce(error)
				.mockResolvedValue(mockDataTable)

			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				scope: STEP_ON_ERROR_SCOPE.STEP,
				retry: {
					attempts: 3,
					delay: 10,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					'max-delay': 30000,
					'after-retries': STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP
				}
			}

			const stepParams = {
				'on-error': onError,
				test: 'param'
			}
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}
			mockDataTable.Count = vi.fn().mockResolvedValue(5)

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)
			expect(result.metrics).toBeDefined()

			const metrics = result.metrics
			expect(metrics.step.status).toBe('success')
			expect(metrics.attemptCount).toBe(3) // Should have attempted 3 times
			expect(metrics.rows.input).toBe(5)
			expect(metrics.rows.passed).toBe(5)
			expect(mockStepFn).toHaveBeenCalledTimes(3)
		})

		it('should track metrics when retries are exhausted at step scope', async () => {
			// Arrange
			const error = new Error('Test error')
			const mockStepFn = vi.fn().mockRejectedValue(error)

			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				scope: STEP_ON_ERROR_SCOPE.STEP,
				retry: {
					attempts: 2,
					delay: 10,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					'max-delay': 30000,
					'after-retries': STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP
				}
			}

			const stepParams = {
				'on-error': onError,
				test: 'param'
			}
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}
			mockDataTable.Count = vi.fn().mockResolvedValue(5)

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS) // After retries, skip strategy
			expect(result.data).toBe(mockDataTable)
			expect(result.metrics).toBeDefined()

			const metrics = result.metrics
			expect(metrics.step.status).toBe('success')
			expect(metrics.attemptCount).toBe(2) // Should have attempted 2 times
			expect(metrics.rows.input).toBe(5)
			expect(metrics.rows.passed).toBe(5)
			expect(mockStepFn).toHaveBeenCalledTimes(2)
		})
	})

	describe('Row Scope Error Handling', () => {
		it('should track metrics for skip strategy at row scope', async () => {
			// Arrange
			const mockRowFn = vi.fn()
				.mockResolvedValueOnce({ id: 1, value: 'test1' })
				.mockRejectedValueOnce(new Error('Row processing failed'))
				.mockResolvedValueOnce({ id: 3, value: 'test3' })

			const mockStepFn = vi.fn().mockResolvedValue(mockDataTable)

			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.SKIP,
				scope: STEP_ON_ERROR_SCOPE.ROW
			}

			const stepParams = {
				'on-error': onError,
				test: 'param'
			}
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}

			// Mock RowsMap to simulate row processing
			mockDataTable.RowsMap = vi.fn().mockImplementation(async (fn) => {
				const rows = [
					{ __idx__: '1', id: 1, value: 'test1' },
					{ __idx__: '2', id: 2, value: 'test2' },
					{ __idx__: '3', id: 3, value: 'test3' }
				]

				for (const row of rows) {
					await fn(row, stepParams, $context)
				}

				return mockDataTable
			})
			mockDataTable.Count = vi.fn()
				.mockResolvedValueOnce(3) // Input count
				.mockResolvedValueOnce(3) // Output count

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn, mockRowFn)(stepParams, $context)

			// Assert
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)
			expect(result.metrics).toBeDefined()

			const metrics = result.metrics
			expect(metrics.step.status).toBe('success')
			expect(metrics.attemptCount).toBe(1)
			expect(metrics.rows.input).toBe(3)
			expect(metrics.rows.passed).toBe(3)
			expect(metrics.rows.skipped).toBe(0)
			expect(metrics.rows.sunk).toBe(0)
		})

		it('should track metrics for sink strategy at row scope', async () => {
			// Arrange
			const mockRowFn = vi.fn()
				.mockResolvedValueOnce({ id: 1, value: 'test1' })
				.mockRejectedValueOnce(new Error('Row processing failed'))
				.mockResolvedValueOnce({ id: 3, value: 'test3' })

			const mockStepFn = vi.fn().mockResolvedValue(mockDataTable)

			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.SINK,
				scope: STEP_ON_ERROR_SCOPE.ROW,
				sink: {
					schema: 'errors',
					entity: 'failed_rows',
					'include-error': true,
					'error-field': 'error-details'
				}
			}

			const stepParams = {
				'on-error': onError,
				test: 'param'
			}
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}

			// Mock RowsMap to simulate row processing
			mockDataTable.RowsMap = vi.fn().mockImplementation(async (fn) => {
				const rows = [
					{ __idx__: '1', id: 1, value: 'test1' },
					{ __idx__: '2', id: 2, value: 'test2' },
					{ __idx__: '3', id: 3, value: 'test3' }
				]

				for (const row of rows) {
					await fn(row, stepParams, $context)
				}

				return mockDataTable
			})
			mockDataTable.Count = vi.fn()
				.mockResolvedValueOnce(3) // Input count
				.mockResolvedValueOnce(2) // Output count (one row sunk)

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn, mockRowFn)(stepParams, $context)

			// Assert
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)
			expect(result.metrics).toBeDefined()

			const metrics = result.metrics
			expect(metrics.step.status).toBe('success')
			expect(metrics.attemptCount).toBe(1)
			expect(metrics.rows.input).toBe(3)
			expect(metrics.rows.passed).toBe(2)
			expect(metrics.rows.sunk).toBe(1)
			expect(metrics.rows.skipped).toBe(0)
			expect(mockDataTable.RowMarkForDeletion).toHaveBeenCalledWith('2') // Failed row marked for deletion
		})

		it('should track metrics for retry strategy at row scope', async () => {
			// Arrange
			const mockRowFn = vi.fn()
				.mockResolvedValueOnce({ id: 1, value: 'test1' })
				.mockRejectedValueOnce(new Error('Row processing failed'))
				.mockResolvedValueOnce({ id: 2, value: 'test2' }) // Retry succeeds
				.mockResolvedValueOnce({ id: 3, value: 'test3' })

			const mockStepFn = vi.fn().mockResolvedValue(mockDataTable)

			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				scope: STEP_ON_ERROR_SCOPE.ROW,
				retry: {
					attempts: 2,
					delay: 10,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					'max-delay': 30000,
					'after-retries': STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP
				}
			}

			const stepParams = {
				'on-error': onError,
				test: 'param'
			}
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}

			// Mock RowsMap to simulate row processing
			mockDataTable.RowsMap = vi.fn().mockImplementation(async (fn) => {
				const rows = [
					{ __idx__: '1', id: 1, value: 'test1' },
					{ __idx__: '2', id: 2, value: 'test2' },
					{ __idx__: '3', id: 3, value: 'test3' }
				]

				for (const row of rows) {
					await fn(row, stepParams, $context)
				}

				return mockDataTable
			})
			mockDataTable.Count = vi.fn()
				.mockResolvedValueOnce(3) // Input count
				.mockResolvedValueOnce(3) // Output count

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn, mockRowFn)(stepParams, $context)

			// Assert
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)
			expect(result.metrics).toBeDefined()

			const metrics = result.metrics
			expect(metrics.step.status).toBe('success')
			expect(metrics.attemptCount).toBe(1) // Step-level attempt count
			expect(metrics.rows.input).toBe(3)
			expect(metrics.rows.passed).toBe(3)
			expect(metrics.rows.skipped).toBe(0)
			expect(metrics.rows.sunk).toBe(0)
			expect(mockRowFn).toHaveBeenCalledTimes(4) // 3 initial + 1 retry
		})
	})

	describe('Error Context Tracking', () => {
		it('should track attempt count in error context', async () => {
			// Arrange
			const error = new Error('Test error')
			const mockStepFn = vi.fn().mockRejectedValue(error)

			const onError: U__on_error_Params = {
				strategy: STEP_ON_ERROR_STRATEGY.RETRY,
				scope: STEP_ON_ERROR_SCOPE.STEP,
				retry: {
					attempts: 2,
					delay: 10,
					backoff: STEP_ON_ERROR_RETRY_BACKOFF.FIXED,
					'max-delay': 30000,
					'after-retries': STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW
				}
			}

			const stepParams = {
				'on-error': onError,
				test: 'param'
			}
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}
			mockDataTable.Count = vi.fn().mockResolvedValue(5)

			// Act & Assert
			try {
				await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)
				expect.fail('Should have thrown an error')
			} catch {
				// Verify error context was updated with attempt count
				expect($context.$error).toBeDefined()
				expect($context.$error?.attempt).toBe(2)
			}
		})
	})
})
