/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
//
//
//
import type z from "zod"
import type { DataTable, TRow } from "../../types/DataTable"
import { Logger } from "../../utils/Logger"
import { Utils } from "../../utils/Utils"
import type { TContext } from "../sandbox/types/TContext"
import { STEP, STEP_ON_ERROR_RETRY_BACKOFF, STEP_ON_ERROR_STRATEGY } from "./@consts"
import type { TStep } from "./types/TStep"
import type { U__plans_plan__step, U__plans_plan__step_Params } from "./types/U__plans_plan__step"
import type { U__on_error, U__on_error_Params, U__on_error_strategy_retry, U__on_error_strategy_sink, z__on_error_retry, z__on_error_sink } from "./types/U__plans_plan_on_error"
import { isEmpty } from "lodash-es"


//
export type TFunctionStep = (step: TStep, $context?: Partial<TContext>) => Promise<DataTable | undefined>


//
export class Step {

	@Logger.LogFunction()
	static readonly ExecuteCaseMap: Record<string, TFunctionStep> = {
		[STEP.DEBUG]: async (step, $context) => (await import('./steps/Debug')).Debug(step, $context),
		[STEP.SELECT]: async (step, $context) => (await import('./steps/Select')).Select(step, $context),
		[STEP.UPDATE]: async (step, $context) => (await import('./steps/Update')).Update(step, $context),
		[STEP.DELETE]: async (step, $context) => (await import('./steps/Delete')).Delete(step, $context),
		[STEP.INSERT]: async (step, $context) => (await import('./steps/Insert')).Insert(step, $context),
		[STEP.JOIN]: async (step, $context) => (await import('./steps/Join')).Join(step, $context),
		[STEP.FIELDS]: async (step, $context) => (await import('./steps/Pick')).Pick(step, $context),
		[STEP.SORT]: async (step, $context) => (await import('./steps/Sort')).Sort(step, $context),
		[STEP.RUN]: async (step, $context) => (await import('./steps/Run')).Run(step, $context),
		[STEP.SYNC]: async (step, $context) => (await import('./steps/Sync')).Sync(step, $context),
		[STEP.ANONYMIZE]: async (step, $context) => (await import('./steps/Anonymize')).Anonymize(step, $context),
		[STEP.REMOVE_DUPLICATE]: async (step, $context) => (await import('./steps/RemoveDuplicates')).RemoveDuplicates(step, $context),
		[STEP.LIST_ENTITIES]: async (step, $context) => (await import('./steps/ListEntities')).ListEntities(step, $context),
		[STEP.BREAK]: async (step, $context) => (await import('./steps/Break')).Break(step, $context),
		[STEP.PICK]: async (step, $context) => (await import('./steps/Pick')).Pick(step, $context),
		[STEP.OMIT]: async (step, $context) => (await import('./steps/Omit')).Omit(step, $context),
		[STEP.MAP]: async (step, $context) => (await import('./steps/MapRows')).MapRows(step, $context),
		[STEP.SET_VAR]: async (step, $context) => (await import('./steps/SetVar')).SetVar(step, $context),
	}

	private static async _onErrorRowRetry(
		rowFunction: (row: TRow) => Promise<TRow>,
		row: TRow,
		onErrorConfig: U__on_error_strategy_retry
	): Promise<TRow> {

		const retryConfig = onErrorConfig.retry 
		if (!retryConfig) {
			throw new Error("Retry configuration not found")
		}

		const { attempts, delay, backoff, "max-delay": maxDelay } = retryConfig
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

	private static async _onErrorRowSink(
		error: any,
		row: TRow,
		_$context: Partial<TContext>,
		onErrorConfig: U__on_error_strategy_sink | U__on_error_strategy_retry
	): Promise<void> {
		const sinkConfig = onErrorConfig.sink
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

	private static async _applyOnErrorStrategy(stepFunction: TFunctionStep, stepArgs: TStep, $context: Partial<TContext>, onErrorConfig: U__on_error): Promise<DataTable | undefined> {
		// Check for unified error config
		if (onErrorConfig["on-error"]) {
			return await Step._applyUnifiedErrorStrategy(stepFunction, stepArgs, $context, onErrorConfig["on-error"]);
		}

		// Default behavior (backward compatibility)
		return await stepFunction(stepArgs, $context);
	}

	private static async _onErrorThrow(stepFunction: TFunctionStep, stepArgs: TStep, $context: Partial<TContext>): Promise<DataTable | undefined> {
		return await stepFunction(stepArgs, $context)
	}

	private static async _onErrorSkip(
		stepFunction: TFunctionStep,
		stepArgs: TStep,
		$context: Partial<TContext>
	): Promise<DataTable | undefined> {
		// For step-level, skip means return undefined (no data change)
		// Row-level skip will be handled in individual steps
		return undefined
	}

	private static async _onErrorSink(
		stepFunction: TFunctionStep,
		stepArgs: TStep,
		$context: Partial<TContext>,
		sinkConfig: U__on_error_strategy_sink | U__on_error_strategy_retry
	): Promise<DataTable | undefined> {

		try {
			return await stepFunction(stepArgs, $context)
		} catch (error) {
			await Step._sinkError(error, stepArgs, $context, sinkConfig)
			return undefined
		}
	}

	private static async _onErrorRetry(
		stepFunction: TFunctionStep,
		stepArgs: TStep,
		$context: Partial<TContext>,
		retryConfig:U__on_error_strategy_retry
	): Promise<DataTable | undefined> {

		const retry = retryConfig.retry

		if (!retry) {
			return await Step._onErrorThrow(stepFunction, stepArgs, $context)
		}

		const {
			attempts,
			delay,
			backoff,
			then,
			"max-delay": maxDelay
		} = retry

		let lastError: any

		for (let attempt = 1; attempt <= attempts; attempt++) {
			try {
				return await stepFunction(stepArgs, $context)
			} catch (error) {
				lastError = error
				if (attempt < attempts) {
					const retryDelay = Step._calculateRetryDelay(attempt, delay, backoff, maxDelay)
					await Utils.Sleep(retryDelay)
				}
			}
		}

		// Apply fallback strategy after retries are exhausted
		switch (then) {
			case "sink":
				if (!isEmpty(retryConfig.sink)) {
					await Step._sinkError(lastError, stepArgs, $context, retryConfig)
				}
				return undefined
			case "skip":
				return undefined
			case "throw":
			default:
				throw lastError
		}
	}

	private static async _applyUnifiedErrorStrategy(stepFunction: TFunctionStep, stepArgs: TStep, $context: Partial<TContext>, errorConfig: U__on_error_Params): Promise<DataTable | undefined> {
		const { strategy } = errorConfig;

		// Apply scope-specific logic
		switch (strategy) {
			case STEP_ON_ERROR_STRATEGY.THROW:
				return await Step._onErrorThrow(stepFunction, stepArgs, $context);

			case STEP_ON_ERROR_STRATEGY.SKIP:
				return await Step._onErrorSkip(stepFunction, stepArgs, $context);

			case STEP_ON_ERROR_STRATEGY.SINK:
				if (errorConfig?.sink) {
					return await Step._onErrorSink(stepFunction, stepArgs, $context, errorConfig);
				}
				throw new Error('Sink strategy requires sink configuration');

			case STEP_ON_ERROR_STRATEGY.RETRY:
				return await Step._onErrorRetry(stepFunction, stepArgs, $context, errorConfig);

			default:
				throw new Error(`Unsupported error strategy: ${strategy}`);
		}
	}

	private static _calculateRetryDelay(attempt: number, baseDelay: number, backoff: STEP_ON_ERROR_RETRY_BACKOFF, maxDelay: number): number {
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

	private static async _sinkError(
		error: any,
		stepArgs: TStep,
		$context: Partial<TContext>,
		onErrorConfig: U__on_error_strategy_sink | U__on_error_strategy_retry
	): Promise<void> {
		const sinkConfig = onErrorConfig.sink
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

	static GetStepParams(stepConfig: U__plans_plan__step): U__plans_plan__step_Params {
		return Object.values(stepConfig)[0]
	}

	static GetOnErrorConfig(stepConfig: U__plans_plan__step): U__on_error_Params | undefined {
		const stepParams = Step.GetStepParams(stepConfig)
		return stepParams && typeof stepParams === 'object' && 'on-error' in stepParams
			? stepParams['on-error']
			: undefined
	}

	static async ExecuteOnError(
		stepFunction: TFunctionStep,
		stepArgs: TStep,
		$context: Partial<TContext>,
		stepConfig: U__plans_plan__step,
		entityOnErrorConfig?: U__on_error_Params
	): Promise<DataTable | undefined> {

		const stepParams = Step.GetStepParams(stepConfig)

		// Check if this step type supports on-error (data processing steps)
		const stepHasOnError = stepParams && typeof stepParams === 'object' && 'on-error' in stepParams

		let onErrorConfig = stepHasOnError
			? stepParams['on-error']
			: entityOnErrorConfig

		if (!onErrorConfig) {
			// No error handling, execute normally
			return await stepFunction(stepArgs, $context)
		}

		// Apply error handling strategies
		return await Step._applyOnErrorStrategy(
			stepFunction,
			stepArgs,
			$context,
			onErrorConfig
		)
	}

	static async ExecuteRowWithErrorHandling(
		row: TRow,
		rowFunction: (row: TRow) => Promise<TRow>,
		$context: Partial<TContext>,
		onErrorConfig: U__on_error_Params
	): Promise<TRow | undefined> {
		try {
			return await rowFunction(row)
		} catch (error) {
			const { strategy } = onErrorConfig

			switch (strategy) {
				case STEP_ON_ERROR_STRATEGY.SKIP:
					return undefined // Signal to skip this row

				case STEP_ON_ERROR_STRATEGY.SINK:
					await Step._onErrorRowSink(error, row, $context, onErrorConfig)
					return undefined // Signal to skip this row

				case STEP_ON_ERROR_STRATEGY.RETRY:
					return await Step._onErrorRowRetry(rowFunction, row, onErrorConfig)

				case STEP_ON_ERROR_STRATEGY.THROW:
				default:
					throw error
			}
		}
	}
}
