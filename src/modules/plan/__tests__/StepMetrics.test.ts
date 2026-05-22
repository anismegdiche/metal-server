//
//
//
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataTable } from '../../../types/DataTable'
import type { TContext } from '../../sandbox/types/TContext'
import { STEP, STEP_OUTCOME, STEP_SIGNAL, STEP_STATUS } from '../@consts'
import { Step } from '../Step'
import { PLAN_METRICS, PlanMetrics } from '../metrics/PlanMetrics'
import type { T_StepMetrics } from "../metrics/PlanMetrics"

// Mock DataTable methods
const mockDataTable = {
	Count: vi.fn(),
	RowsMap: vi.fn(),
	GetDeletedRowsCount: vi.fn(() => 0),
	CleanForDeletion: vi.fn((dt) => dt),
} as unknown as DataTable

describe('Step Metrics Collection', () => {
	const capturedEvents: { type: string; data: Partial<T_StepMetrics> }[] = []

	beforeEach(() => {
		vi.clearAllMocks()
		capturedEvents.length = 0
		PlanMetrics.Metrics.clear()

		// Set up event listeners to capture metrics events
		PlanMetrics.Bus.addEventListener(PLAN_METRICS.STEP_START, (e) => {
			capturedEvents.push({ type: PLAN_METRICS.STEP_START, data: (e as CustomEvent<Partial<T_StepMetrics>>).detail })
		})
		PlanMetrics.Bus.addEventListener(PLAN_METRICS.STEP_END, (e) => {
			capturedEvents.push({ type: PLAN_METRICS.STEP_END, data: (e as CustomEvent<Partial<T_StepMetrics>>).detail })
		})
		PlanMetrics.Bus.addEventListener(PLAN_METRICS.STEP_INC, (e) => {
			capturedEvents.push({ type: PLAN_METRICS.STEP_INC, data: (e as CustomEvent<Partial<T_StepMetrics>>).detail })
		})
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
			const result = await Step.WrapStepWithSignal(mockStepFn)(stepParams, $context)

			// Assert
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)

			// Check captured events
			const startEvent = capturedEvents.find(e => e.type === PLAN_METRICS.STEP_START)
			const completeEvent = capturedEvents.find(e => e.type === PLAN_METRICS.STEP_END)

			expect(startEvent).toBeDefined()
			expect(startEvent?.data.planName).toBe('test-plan')
			expect(startEvent?.data.index).toBe(0)
			expect(startEvent?.data.step?.startTime).toBeInstanceOf(Date)
			expect(startEvent?.data.attemptCount).toBe(1)
			expect(startEvent?.data.rows?.input).toBe(5)

			expect(completeEvent).toBeDefined()
			expect(completeEvent?.data.planName).toBe('test-plan')
			expect(completeEvent?.data.index).toBe(0)
			expect(completeEvent?.data.step?.endTime).toBeInstanceOf(Date)
			expect(completeEvent?.data.step?.status).toBe(STEP_STATUS.SUCCESS)
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
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)

			// Check captured events
			const startEvent = capturedEvents.find(e => e.type === PLAN_METRICS.STEP_START)
			expect(startEvent?.data.rows?.input).toBe(10)
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

			// Check captured events
			const startEvent = capturedEvents.find(e => e.type === PLAN_METRICS.STEP_START)
			const completeEvent = capturedEvents.find(e => e.type === PLAN_METRICS.STEP_END)

			expect(startEvent).toBeDefined()
			expect(startEvent?.data.planName).toBe('test-plan')
			expect(startEvent?.data.index).toBe(0)
			expect(startEvent?.data.step?.startTime).toBeInstanceOf(Date)
			expect(startEvent?.data.attemptCount).toBe(1)

			expect(completeEvent).toBeDefined()
			expect(completeEvent?.data.planName).toBe('test-plan')
			expect(completeEvent?.data.index).toBe(0)
			expect(completeEvent?.data.step?.endTime).toBeInstanceOf(Date)
			expect(completeEvent?.data.step?.status).toBe(STEP_STATUS.FAILED)
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
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)

			// Check captured events
			const startEvent = capturedEvents.find(e => e.type === PLAN_METRICS.STEP_START)
			expect(startEvent?.data.rows?.input).toBe(0)
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
			expect(result).toBeDefined()
			expect(result.outcome).toBe(STEP_OUTCOME.SUCCESS)

			// Check captured events
			const startEvent = capturedEvents.find(e => e.type === PLAN_METRICS.STEP_START)
			expect(startEvent?.data.rows?.input).toBe(3)
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
			expect(result).toBeDefined()
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
			expect(result).toBeDefined()
		})
	})
})
