/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
//
//
//
import { isEmpty } from "lodash-es"
//
import type { DataTable, TRow } from "../../types/DataTable"
import { Logger } from "../../utils/Logger"
import { Utils } from "../../utils/Utils"
import type { TContext } from "../sandbox/types/TContext"
import { STEP, STEP_ON_ERROR_RETRY_BACKOFF, STEP_ON_ERROR_STRATEGY } from "./@consts"
import type { T_StepResult } from "./types/T_StepResult"
import type { U__plans_plan__step, U__plans_plan__step_Params } from "./types/U__plans_plan__step"
import type { U__on_error_Params, U__on_error_strategy_retry, U__on_error_strategy_sink } from "./types/U__plans_plan_on_error"


//
export enum STEP_SIGNAL {
	NEXT = "next",
	STOP = "stop"
}

export enum STEP_OUTCOME {
	SUCCESS = "success",
	FAILED = "failed"
}
//
export type T_StepFunctionWithSignal = (stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>) => Promise<T_StepResult>
export type T_StepFunctionBase = (stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>) => Promise<DataTable | undefined>

//
export class Step {

	static WrapStepWithSignal(stepFunction: T_StepFunctionBase, signal: STEP_SIGNAL = STEP_SIGNAL.NEXT)
		: T_StepFunctionWithSignal {
		return async (stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<T_StepResult> => {
			const onError = (stepParams as Record<string, unknown>)['on-error'] as U__on_error_Params

			if (!onError) {
				// Original behavior - no error handling
				return await stepFunction(stepParams, $context)
					.then(data => ({
						data,
						signal,
						outcome: STEP_OUTCOME.SUCCESS,
						$context: $context as TContext
					}))
					.catch(() => ({
						data: undefined,
						signal,
						outcome: STEP_OUTCOME.FAILED,
						$context: $context as TContext
					}))
			}

			// Apply error handling strategies
			const result = await Step._applyUnifiedErrorStrategy(
				async (params, context) => {
					const stepResult = await stepFunction(params, context || {})
					return {
						data: stepResult,
						signal,
						outcome: STEP_OUTCOME.SUCCESS,
						$context: (context || {}) as TContext
					}
				},
				stepParams,
				$context || {},
				onError
			)

			// Return the result (already in T_StepResult format) or handle undefined
			return result ?? {
				data: undefined,
				signal,
				outcome: STEP_OUTCOME.FAILED,
				$context: $context as TContext
			}
		}
	}

	@Logger.LogFunction()
	static readonly ExecuteCaseMap: Record<string, T_StepFunctionWithSignal> = {
		[STEP.DEBUG]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Debug')).Debug(stepParams, $context)),
		[STEP.SELECT]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Select')).Select(stepParams, $context)),
		[STEP.UPDATE]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Update')).Update(stepParams, $context)),
		[STEP.DELETE]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Delete')).Delete(stepParams, $context)),
		[STEP.INSERT]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Insert')).Insert(stepParams, $context)),
		[STEP.JOIN]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Join')).Join(stepParams, $context)),
		[STEP.FIELDS]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Pick')).Pick(stepParams, $context)),
		[STEP.SORT]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Sort')).Sort(stepParams, $context)),
		[STEP.RUN]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Run')).Run(stepParams, $context)),
		[STEP.SYNC]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Sync')).Sync(stepParams, $context)),
		[STEP.ANONYMIZE]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Anonymize')).Anonymize(stepParams, $context)),
		[STEP.REMOVE_DUPLICATE]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/RemoveDuplicates')).RemoveDuplicates(stepParams, $context)),
		[STEP.LIST_ENTITIES]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/ListEntities')).ListEntities(stepParams, $context)),
		[STEP.BREAK]: Step.WrapStepWithSignal(async (stepParams, _$context) => (await import('./steps/Break')).Break(stepParams), STEP_SIGNAL.STOP),
		[STEP.PICK]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Pick')).Pick(stepParams, $context)),
		[STEP.OMIT]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/Omit')).Omit(stepParams, $context)),
		[STEP.MAP]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/MapRows')).MapRows(stepParams, $context)),
		[STEP.SET_VAR]: Step.WrapStepWithSignal(async (stepParams, $context) => (await import('./steps/SetVar')).SetVar(stepParams, $context)),
	}

	static async _onErrorRowRetry(
		rowFunction: (row: TRow) => Promise<TRow>,
		row: TRow,
		onError: U__on_error_strategy_retry
	): Promise<TRow> {

		const retryConfig = onError.retry

		if (!retryConfig) {
			throw new Error("Retry configuration not found")
		}

		const {
			attempts,
			delay,
			backoff,
			"max-delay": maxDelay
		} = retryConfig

		let lastError: any

		for (let attempt = 1; attempt <= attempts; attempt++) {
			try {
				return await rowFunction(row)
			} catch (error) {
				lastError = error
				if (attempt < attempts) {
					const retryDelay = Step._calculateRetryDelay(attempt, delay, backoff, maxDelay)
					await Utils.Sleep(retryDelay)
				}
			}
		}

		throw lastError
	}

	static async _onErrorRowSink(
		error: any,
		row: TRow,
		_$context: Partial<TContext>,
		onError: U__on_error_strategy_sink | U__on_error_strategy_retry
	): Promise<void> {
		const sinkConfig = onError.sink
		if (!sinkConfig) {
			throw error
		}

		// TODO: Implement actual row-level sinking to error destination
		Logger.Error(`Row error sunk to ${sinkConfig.schema}.${sinkConfig.entity}: ${error}`)

		// For now, just log the error
		// In full implementation, this would:
		// 1. Create error record with original_data (the row), error_details, step_info, timestamp, attempt
		// 2. Insert into sink destination
	}

	static async _onErrorThrow(stepFunction: T_StepFunctionWithSignal, stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<T_StepResult> {
		return await stepFunction(stepParams, $context)
	}

	static async _onErrorSkip(
		stepFunction: T_StepFunctionWithSignal,
		stepParams: U__plans_plan__step_Params,
		$context: Partial<TContext>
	): Promise<T_StepResult | undefined> {
		// For step-level, skip means return undefined (no data change)
		// Row-level skip will be handled in individual steps
		return undefined
	}

	static async _onErrorSink(
		stepFunction: T_StepFunctionWithSignal,
		stepParams: U__plans_plan__step_Params,
		$context: Partial<TContext>,
		sinkConfig: U__on_error_strategy_sink | U__on_error_strategy_retry
	): Promise<T_StepResult | undefined> {

		try {
			return await stepFunction(stepParams, $context)
		} catch (error) {
			await Step._sinkError(error, stepParams, $context, sinkConfig)
			return undefined
		}
	}

	static async _onErrorRetry(
		stepFunction: T_StepFunctionWithSignal,
		stepParams: U__plans_plan__step_Params,
		$context: Partial<TContext>,
		retryConfig: U__on_error_strategy_retry
	): Promise<T_StepResult | undefined> {

		const retry = retryConfig.retry

		if (!retry) {
			return await Step._onErrorThrow(stepFunction, stepParams, $context)
		}

		const {
			attempts,
			delay,
			backoff,
			"after-retries": afterRetries,
			"max-delay": maxDelay
		} = retry

		let lastError: any

		for (let attempt = 1; attempt <= attempts; attempt++) {
			try {
				return await stepFunction(stepParams, $context)
			} catch (error) {
				lastError = error
				if (attempt < attempts) {
					const retryDelay = Step._calculateRetryDelay(attempt, delay, backoff, maxDelay)
					await Utils.Sleep(retryDelay)
				}
			}
		}

		// Apply fallback strategy after retries are exhausted
		switch (afterRetries) {
			case "sink":
				if (!isEmpty(retryConfig.sink)) {
					await Step._sinkError(lastError, stepParams, $context, retryConfig)
				}
				return undefined
			case "skip":
				return undefined
			case "throw":
			default:
				throw lastError
		}
	}

	static async _applyUnifiedErrorStrategy(stepFunction: T_StepFunctionWithSignal, stepParams: U__plans_plan__step_Params, $context: Partial<TContext>, errorConfig: U__on_error_Params): Promise<T_StepResult | undefined> {
		const { strategy } = errorConfig;

		// Apply scope-specific logic
		switch (strategy) {
			case STEP_ON_ERROR_STRATEGY.THROW:
				return await Step._onErrorThrow(stepFunction, stepParams, $context);

			case STEP_ON_ERROR_STRATEGY.SKIP:
				return await Step._onErrorSkip(stepFunction, stepParams, $context);

			case STEP_ON_ERROR_STRATEGY.SINK:
				if (errorConfig?.sink) {
					return await Step._onErrorSink(stepFunction, stepParams, $context, errorConfig);
				}
				throw new Error('Sink strategy requires sink configuration');

			case STEP_ON_ERROR_STRATEGY.RETRY:
				return await Step._onErrorRetry(stepFunction, stepParams, $context, errorConfig);

			default:
				throw new Error(`Unsupported error strategy: ${strategy}`);
		}
	}

	static _calculateRetryDelay(attempt: number, baseDelay: number, backoff: STEP_ON_ERROR_RETRY_BACKOFF, maxDelay: number): number {
		let delay: number

		switch (backoff) {
			case STEP_ON_ERROR_RETRY_BACKOFF.LINEAR:
				delay = baseDelay * attempt
				break

			case STEP_ON_ERROR_RETRY_BACKOFF.EXPONENTIAL:
				delay = baseDelay * 2 ** (attempt - 1)
				break

			case STEP_ON_ERROR_RETRY_BACKOFF.FIXED:
			default: // fixed
				delay = baseDelay
				break
		}

		return Math.min(delay, maxDelay)
	}

	static async _sinkError(
		error: any,
		stepParams: U__plans_plan__step_Params,
		$context: Partial<TContext>,
		onError: U__on_error_strategy_sink | U__on_error_strategy_retry
	): Promise<void> {
		const sinkConfig = onError.sink
		if (!sinkConfig) {
			throw error
		}

		// TODO: Implement actual sinking to error destination
		Logger.Error(`Error sunk to ${sinkConfig.schema}.${sinkConfig.entity}: ${error}`)

		// For now, just log the error
		// In full implementation, this would:
		// 1. Create error record with original_data, error_details, step_info, timestamp, attempt
		// 2. Insert into sink destination
	}

	static GetStepParams(step: U__plans_plan__step) {
		return {
			command: Object.keys(step)[0] as STEP,
			params: Object.values(step)[0] as U__plans_plan__step_Params
		}
	}

	static GetOnError(step: U__plans_plan__step): U__on_error_Params {
		const { params } = Step.GetStepParams(step)
		return (params as Record<string, unknown>)['on-error'] as U__on_error_Params
	}

	static async OnErrorRow(
		row: TRow,
		rowFunction: (row: TRow) => Promise<TRow>,
		$context: Partial<TContext>,
		onError: U__on_error_Params
	): Promise<TRow | undefined> {
		try {
			return await rowFunction(row)
		} catch (error) {
			const { strategy } = onError

			switch (strategy) {
				case STEP_ON_ERROR_STRATEGY.SKIP:
					return undefined // Signal to skip this row

				case STEP_ON_ERROR_STRATEGY.SINK:
					await Step._onErrorRowSink(error, row, $context, onError)
					return undefined // Signal to skip this row

				case STEP_ON_ERROR_STRATEGY.RETRY:
					return await Step._onErrorRowRetry(rowFunction, row, onError)

				case STEP_ON_ERROR_STRATEGY.THROW:
				default:
					throw error
			}
		}
	}
}
