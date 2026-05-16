//
//
//
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataTable } from '../../../types/DataTable'
import type { TContext } from '../../sandbox/types/TContext'
import { STEP, STEP_OUTCOME, STEP_SIGNAL } from '../@consts'
import { Step } from '../Step'

// Mock DataTable methods
const mockDataTable = {
	Count: vi.fn(),
	RowsMap: vi.fn(),
	GetDeletedRowsCount: vi.fn(() => 0),
	CleanForDeletion: vi.fn((dt) => dt),
} as unknown as DataTable

describe('Step Metrics Collection', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Basic Metrics Collection', () => {
		it('should collect timing metrics for successful step execution', async () => {
			// Arrange
			const mockStepFn = vi.fn().mockResolvedValue(mockDataTable)
			mockDataTable.Count = vi.fn().mockResolvedValue(5)

			const stepParams = { test: 'param' }
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}

			// Act
			const startTime = Date.now()
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)
			const endTime = Date.now()

			// Assert
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)
			expect(result.metrics).toBeDefined()

			const metrics = result?.metrics
			expect(metrics.step.startTime).toBeInstanceOf(Date)
			expect(metrics.step.endTime).toBeInstanceOf(Date)
			expect(metrics.step.durationMs).toBeDefined()
			expect(metrics?.step.durationMs).toBeGreaterThanOrEqual(0)
			expect(metrics?.step.durationMs).toBeLessThanOrEqual(endTime - startTime + 100) // Allow some tolerance
			expect(metrics.step.status).toBe('success')
			expect(metrics.attemptCount).toBe(1)
		})

		it('should collect row metrics for successful step execution', async () => {
			// Arrange
			const mockStepFn = vi.fn().mockResolvedValue(mockDataTable)
			mockDataTable.Count = vi.fn()
				.mockResolvedValueOnce(10) // Input count
				.mockResolvedValueOnce(8)  // Output count

			const stepParams = { test: 'param' }
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result.metrics).toBeDefined()
			const metrics = result.metrics
			expect(metrics.rows.input).toBe(10)
			expect(metrics.rows.passed).toBe(8)
			expect(metrics.rows.skipped).toBe(2) // 10 input - 8 output = 2 skipped
			expect(metrics.rows.sunk).toBe(0)
			expect(metrics.rows.failed).toBe(0)
		})

		it('should collect metrics for failed step execution', async () => {
			// Arrange
			const error = new Error('Test error')
			const mockStepFn = vi.fn().mockRejectedValue(error)

			const stepParams = { test: 'param' }
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.FAILED)
			expect(result.error).toBe(error)
			expect(result.metrics).toBeDefined()

			const metrics = result.metrics
			expect(metrics.step.startTime).toBeDefined()
			expect(metrics.step.endTime).toBeDefined()
			expect(metrics.step.durationMs).toBeDefined()
			expect(metrics.step.durationMs).toBeGreaterThanOrEqual(0)
			expect(metrics.step.status).toBe('failed')
			expect(metrics.attemptCount).toBe(1)
		})

		it('should handle case with no plan data', async () => {
			// Arrange
			const mockStepFn = vi.fn().mockResolvedValue(mockDataTable)
			mockDataTable.Count = vi.fn().mockResolvedValue(5)

			const stepParams = { test: 'param' }
			const $context: Partial<TContext> = {
				$plan: {
					name: 'test-plan',
					currentStep: { index: 0, command: 'test' as unknown as STEP, params: stepParams }
				}
			}

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result.metrics).toBeDefined()
			const metrics = result.metrics
			expect(metrics.rows.input).toBe(0)
			expect(metrics.rows.passed).toBe(5)
			expect(metrics.rows.skipped).toBe(0) // When no input data, rows.skipped should be 0
		})

		it('should handle case with no data returned from step', async () => {
			// Arrange
			const mockStepFn = vi.fn().mockResolvedValue(undefined)

			const stepParams = { test: 'param' }
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}
			mockDataTable.Count = vi.fn().mockResolvedValue(3)

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result.data).toBeUndefined()
			expect(result.metrics).toBeDefined()
			const metrics = result.metrics
			expect(metrics.rows.input).toBe(3)
			expect(metrics.rows.passed).toBe(0)
			expect(metrics.rows.skipped).toBe(0) // No output data to compare
		})
	})

	describe('Signal Handling', () => {
		it('should preserve signal in result', async () => {
			// Arrange
			const mockStepFn = vi.fn().mockResolvedValue(mockDataTable)
			mockDataTable.Count = vi.fn().mockResolvedValue(5)

			const stepParams = { test: 'param' }
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: STEP.DEBUG, params: stepParams }
				}
			}

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn, undefined, STEP_SIGNAL.STOP)(stepParams, $context)

			// Assert
			expect(result.signal).toBe(STEP_SIGNAL.STOP)
			expect(result.metrics).toBeDefined()
		})
	})

	describe('Context Preservation', () => {
		it('should preserve context in result', async () => {
			// Arrange
			const mockStepFn = vi.fn().mockResolvedValue(mockDataTable)
			mockDataTable.Count = vi.fn().mockResolvedValue(5)

			const stepParams = { test: 'param' }
			const $context: Partial<TContext> = {
				$plan: {
					data: mockDataTable,
					name: 'test-plan',
					currentStep: { index: 0, command: 'test' as unknown as STEP, params: stepParams }
				},
				$vars: { test: 'test-value' }
			}

			// Act
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result.$context).toBe($context as TContext)
			expect(result.$context.$vars.test).toBe('test-value')
			expect(result.metrics).toBeDefined()
		})
	})
})
