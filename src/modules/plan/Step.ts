/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
/** biome-ignore-all lint/complexity/noUselessSwitchCase: <explanation> */
//
//
//
import type { DataTable, TRow } from "../../types/DataTable"
import type { TUuidv7 } from "../../types/TUuidv7"
import { Assert } from "../../utils/Assert"
import { Logger } from "../../utils/Logger"
import { Utils } from "../../utils/Utils"
import { HttpErrorInternalServerError, NormalizeError } from "../errors/HttpErrorBase"
import type { TContext } from "../sandbox/types/TContext"
import { STEP, STEP_ON_ERROR_RETRY_AFTER_RETRIES, STEP_ON_ERROR_RETRY_BACKOFF, STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY, STEP_OUTCOME, STEP_SIGNAL } from "./@consts"
import { Insert } from "./steps/Insert"
import type { T_StepResult } from "./types/T_StepResult"
import type { U__plans_plan_insert_Params } from "./types/U__plans_params"
import type { U__plans_plan__step, U__plans_plan__step_Params } from "./types/U__plans_plan__step"
import type { U__on_error_Params, U__on_error_strategy_retry, U__on_error_strategy_sink } from "./types/U__plans_plan_on_error"


//
export type T_StepFunctionWithSignal = (stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>) => Promise<T_StepResult>
export type T_StepFunction = (stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>) => Promise<DataTable | undefined>
export type T_RowFunction = (row: TRow, stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>) => Promise<TRow>

export type T_StepErrorDetails = {
	message: string;
	type: string;
	timestamp: string;
	attempt: number;
	step?: {
		index?: number;
		command?: string;
		params?: U__plans_plan__step_Params;
	};
}

type T_StepOnErrorArgs = {
	fnStep?: T_StepFunction,
	fnRow?: T_RowFunction,
	stepParams: U__plans_plan__step_Params,
	onError?: U__on_error_Params,
	$context?: Partial<TContext>,
	attempt: number,
	row?: TRow,
	error?: Error,
}

//
export class Step {

	@Logger.LogFunction()
	static readonly ExecuteCaseMap: Record<string, T_StepFunctionWithSignal> = {
		[STEP.BREAK]: Step.WrapStepWithSignal(
			async (stepParams, _$context) => (await import('./steps/Break')).Break(stepParams),
			undefined,
			STEP_SIGNAL.STOP
		),
		[STEP.DEBUG]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Debug')).Debug(stepParams, $context)
		),
		[STEP.SET_VAR]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/SetVar')).SetVar(stepParams, $context)
		),
		[STEP.LIST_ENTITIES]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/ListEntities')).ListEntities(stepParams, $context)
		),
		[STEP.SELECT]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Select')).Select(stepParams, $context)
		),
		[STEP.UPDATE]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Update')).Update(stepParams, $context)
		),
		[STEP.DELETE]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Delete')).Delete(stepParams, $context)
		),
		[STEP.JOIN]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Join')).Join(stepParams, $context)
		),
		[STEP.SYNC]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Sync')).Sync(stepParams, $context)
		),
		[STEP.REMOVE_DUPLICATE]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/RemoveDuplicates')).RemoveDuplicates(stepParams, $context)
		),
		[STEP.SORT]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Sort')).Sort(stepParams, $context)
			// SORT cannot have row processor - it's a table-level operation
		),

		// with row function
		[STEP.INSERT]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Insert')).Insert(stepParams, $context),
			async (row, stepParams, $context) => (await import('./steps/Insert'))._insertRow(row, stepParams, $context)
		),
		[STEP.FIELDS]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Pick')).Pick(stepParams, $context),
			async (row, stepParams, $context) => (await import('./steps/Pick'))._pickRow(row, stepParams, $context)
		),
		[STEP.RUN]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Run')).Run(stepParams, $context),
			async (row, stepParams, $context) => (await import('./steps/Run'))._runRow(row, stepParams, $context)
		),
		[STEP.ANONYMIZE]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Anonymize')).Anonymize(stepParams, $context),
			async (row, stepParams, $context) => (await import('./steps/Anonymize'))._anonymizeRow(row, stepParams, $context),
		),
		[STEP.PICK]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Pick')).Pick(stepParams, $context),
			async (row, stepParams, $context) => (await import('./steps/Pick'))._pickRow(row, stepParams, $context)
		),
		[STEP.OMIT]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/Omit')).Omit(stepParams, $context),
			async (row, stepParams, $context) => (await import('./steps/Omit'))._omitRow(row, stepParams, $context)
		),
		[STEP.MAP]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import('./steps/MapRows')).MapRows(stepParams, $context),
			async (row, stepParams, $context) => (await import('./steps/MapRows'))._mapRow(row, stepParams, $context)
		),
	}

	static WrapStepWithSignal(
		fnStep: T_StepFunction,
		fnRow?: T_RowFunction,
		signal: STEP_SIGNAL = STEP_SIGNAL.NEXT
	): T_StepFunctionWithSignal {
		return async (stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<T_StepResult> => {
			const onError = (stepParams as Record<string, unknown>)['on-error'] as U__on_error_Params | undefined

			const _fnStepRouter = async () => {
				if (!onError) {
					return fnStep(stepParams, $context)
				}

				return Step.OnError({
					fnStep,
					fnRow,
					stepParams,
					onError,
					$context,
					attempt: 1
				})
			}

			return _fnStepRouter()
				.then((data) => {
					return <T_StepResult>{
						data,
						signal,
						outcome: STEP_OUTCOME.SUCCESS,
						$context: $context as TContext
					}
				})
				.catch((error) => {
					return <T_StepResult>{
						data: undefined,
						signal,
						outcome: STEP_OUTCOME.FAILED,
						$context: $context as TContext,
						error
					}
				})
		}
	}

	static async OnError({
		fnStep,
		fnRow = undefined,
		stepParams,
		onError,
		$context = undefined,
		attempt,
		error
	}: T_StepOnErrorArgs): Promise<DataTable | undefined> {

		if (!onError)
			return $context?.$plan?.data

		switch (onError.scope) {
			case STEP_ON_ERROR_SCOPE.ROW:
				return Step.OnErrorRow({
					fnRow,
					stepParams,
					onError,
					$context,
					attempt,
					error
				})
					.then(data => data?.CleanForDeletion())

			case STEP_ON_ERROR_SCOPE.STEP:
			default:
				return Step.OnErrorStep({
					fnStep,
					stepParams,
					onError,
					$context,
					attempt,
					error
				})
		}
	}

	static async OnErrorStep({
		fnStep,
		stepParams,
		onError,
		$context,
		attempt,
		error
	}: T_StepOnErrorArgs): Promise<DataTable | undefined> {

		Assert.Var<T_StepFunction>(fnStep, "fnStep is undefined")

		const strategy = onError?.strategy ?? undefined

		return fnStep(stepParams, $context)
			.catch((caughtError) => {
				// Apply scope-specific logic
				switch (strategy) {
					case STEP_ON_ERROR_STRATEGY.RETRY:
						return Step._onErrorStepRetry({
							fnStep,
							stepParams,
							onError,
							$context,
							attempt,
							error: caughtError as Error
						});

					case STEP_ON_ERROR_STRATEGY.SKIP:
						return Step._onErrorStepSkip({
							$context,
							attempt
						});

					case STEP_ON_ERROR_STRATEGY.THROW:
					default:
						return Step._onErrorStepThrow({
							$context,
							attempt,
							error: caughtError as Error
						});
				}
			})
	}

	static async _onErrorStepThrow({
		$context,
		attempt,
		error
	}: Pick<T_StepOnErrorArgs, '$context' | 'attempt' | 'error'>): Promise<DataTable | undefined> {

		const planName = $context?.$plan?.name
		const currentStep = $context?.$plan?.currentStep

		// Inject $error into context for next step
		const errorDetails = Step._errorToJson(error, attempt, $context)
		if ($context) {
			$context.$error = errorDetails
		}

		Logger.Warn(`Plan '${planName}', step ${currentStep?.index} threw an error after ${attempt} attempt(s): ${errorDetails}`);
		throw new HttpErrorInternalServerError(`Plan '${planName}', step ${currentStep?.index} threw an error after ${attempt} attempt(s): ${errorDetails}`);
	}

	static async _onErrorStepSkip({
		$context,
		attempt,
		error
	}: Pick<T_StepOnErrorArgs, '$context' | 'attempt' | 'error'>): Promise<DataTable> {

		const planName = $context?.$plan?.name
		const currentStep = $context?.$plan?.currentStep
		const data = $context?.$plan?.data

		Assert.Var<DataTable>(data, "data is not defined")

		// Inject $error into context for next step
		const errorDetails = Step._errorToJson(error, attempt, $context)
		if ($context) {
			$context.$error = errorDetails
		}

		Logger.Warn(`Plan '${planName}', step ${currentStep?.index} skipped after ${attempt} attempt(s) ${errorDetails}`);
		return data
	}

	static async _onErrorStepRetry({
		fnStep,
		stepParams,
		onError,
		$context,
		attempt,
		error
	}: Pick<T_StepOnErrorArgs, 'fnStep' | 'stepParams' | 'onError' | '$context' | 'attempt' | 'error'>): Promise<DataTable | undefined> {

		const { retry } = onError as U__on_error_strategy_retry

		if (!retry) {
			return await Step._onErrorStepThrow({
				$context,
				attempt,
				error: error || new Error("Unknown error during retry")
			})
		}

		const {
			attempts,
			delay,
			backoff,
			"after-retries": afterRetries,
			"max-delay": maxDelay
		} = retry

		const planName = $context?.$plan?.name
		const currentStep = $context?.$plan?.currentStep

		const retryDelay = Step._calculateRetryDelay(attempt, delay, backoff, maxDelay)

		const nextAttempt = attempt + 1

		if (nextAttempt <= attempts) {
			Logger.Warn(`Plan '${planName}', step ${currentStep?.index}:attempt ${nextAttempt}, retrying after ${retryDelay}ms`)
			await Utils.Sleep(retryDelay)
			return Step.OnErrorStep({
				fnStep,
				stepParams,
				onError,
				$context,
				attempt: nextAttempt
			})
		}

		// Apply fallback strategy after retries are exhausted
		switch (afterRetries) {
			case STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP:
				return Step._onErrorStepSkip({
					$context,
					attempt,
					error
				})
			case STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW:
			default:
				return Step._onErrorStepThrow({
					$context,
					attempt,
					error
				})
		}
	}

	static async OnErrorRow({
		fnRow,
		stepParams,
		onError,
		$context,
		attempt,
		row,
		error
	}: Pick<T_StepOnErrorArgs, 'fnRow' | 'stepParams' | 'onError' | '$context' | 'attempt' | 'row' | 'error'>): Promise<DataTable | undefined> {

		Assert.Var<DataTable>($context?.$plan?.data, "Plan data is undefined")

		if (!fnRow) {
			return $context.$plan.data
		}

		const strategy = onError?.strategy ?? undefined

		return $context?.$plan?.data
			.RowsMap(async (row: Partial<TRow>) => {
				return fnRow(row, stepParams, $context)
					.then(row => row)
					.catch((caughtError) => {
						// Apply scope-specific logic
						switch (strategy) {

							case STEP_ON_ERROR_STRATEGY.SINK:
								return Step._onErrorRowSink({
									onError,
									$context,
									attempt,
									row,
									error: caughtError as Error
								})

							case STEP_ON_ERROR_STRATEGY.RETRY:
								return Step._onErrorRowRetry({
									fnRow,
									stepParams,
									onError,
									$context,
									attempt,
									row,
									error: caughtError as Error
								});

							case STEP_ON_ERROR_STRATEGY.SKIP:
							default:
								return Step._onErrorRowSkip({
									$context,
									attempt,
									row
								});
						}

					})
			})
	}

	static async _onErrorRowSkip({
		$context,
		attempt,
		row
	}: Pick<T_StepOnErrorArgs, '$context' | 'attempt' | 'row'>): Promise<TRow> {

		const planName = $context?.$plan?.name
		const currentStep = $context?.$plan?.currentStep

		// Inject $error into context for next step (row-level errors also set context)
		if ($context) {
			// For row-level errors, we create a generic error since we don't have the specific error
			$context.$error = {
				message: "Row processing skipped due to error",
				type: "RowProcessingError",
				timestamp: new Date().toISOString(),
				attempt: attempt,
				step: currentStep ? {
					index: currentStep.index,
					command: currentStep.command,
					params: currentStep.params
				} : undefined
			}
		}

		Logger.Warn(`Plan '${planName}', step ${currentStep?.index} skipped row after ${attempt} attempt(s)`);
		return row as TRow
	}

	static async _onErrorRowSink({
		onError,
		$context,
		attempt,
		row,
		error
	}: Pick<T_StepOnErrorArgs, 'onError' | '$context' | 'attempt' | 'row' | 'error'>): Promise<TRow> {

		const { sink } = onError as U__on_error_strategy_sink

		const {
			"include-error": includeError,
			"error-field": errorField,
			schema,
			entity
		} = sink

		// TODO: row add err
		Assert.Var<TRow>(row, "row is undefined")

		const errorDetails = Step._errorToJson(error, attempt, $context)

		// Inject $error into context for next step
		if ($context) {
			$context.$error = errorDetails
		}

		const _rowWithError = (includeError)
			? {
				...row,  // Spread original row fields directly
				[errorField]: errorDetails
			}
			: row

		// insert
		const _insertParams: U__plans_plan_insert_Params = {
			schema,
			entity,
			data: [_rowWithError]
		}

		const { __idx__ } = row

		Assert.Var<TUuidv7>(__idx__, "row index is undefined")

		return Insert(_insertParams, $context)
			.then(() => {
				$context?.$plan?.data?.RowMarkForDeletion(__idx__)
			})
			.catch(() => row)
			.then(() => row)
	}

	static async _onErrorRowRetry({
		fnRow,
		stepParams,
		onError,
		$context,
		attempt,
		row,
		error
	}: Pick<T_StepOnErrorArgs, 'fnRow' | 'stepParams' | 'onError' | '$context' | 'attempt' | 'row' | 'error'>): Promise<TRow | undefined> {

		const { retry } = onError as U__on_error_strategy_retry

		Assert.Var(retry, "retry is undefined")

		const {
			attempts,
			delay,
			backoff,
			"after-retries": afterRetries,
			"max-delay": maxDelay
		} = retry

		const planName = $context?.$plan?.name
		const currentStep = $context?.$plan?.currentStep

		const retryDelay = Step._calculateRetryDelay(attempt, delay, backoff, maxDelay)

		const nextAttempt = attempt + 1

		if (nextAttempt <= attempts) {
			Logger.Warn(`Plan '${planName}', step ${currentStep?.index}:attempt ${nextAttempt}, retrying after ${retryDelay}ms`)
			await Utils.Sleep(retryDelay)

			Assert.Var<T_RowFunction>(fnRow, "fnRow is undefined during retry")

			try {
				Assert.Var<TRow>(row, "row is undefined during retry")
				return await fnRow(row, stepParams, $context)
			} catch (retryError) {
				// If retry still fails, recursively call to continue retry logic
				return Step._onErrorRowRetry({
					fnRow,
					stepParams,
					onError,
					$context,
					attempt: nextAttempt,
					row,
					error: retryError as Error
				})
			}
		}

		// Apply fallback strategy after retries are exhausted
		switch (afterRetries) {

			case STEP_ON_ERROR_RETRY_AFTER_RETRIES.SINK:
				return Step._onErrorRowSink({
					onError,
					$context,
					attempt,
					row,
					error
				});

			case STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP:
			default:
				return Step._onErrorRowSkip({
					$context,
					attempt,
					row
				});
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

	static _errorToJson(error: Error | undefined, attempt: number, $context?: Partial<TContext>): T_StepErrorDetails {
		const normalizedError = NormalizeError(error)
		const currentStep = $context?.$plan?.currentStep

		return {
			message: normalizedError?.message,
			type: normalizedError?.name,
			timestamp: new Date().toISOString(),
			attempt: attempt,
			step: {
				index: currentStep?.index,
				command: currentStep?.command,
				params: currentStep?.params
			}
		}
	}

	static GetStepParams(step: U__plans_plan__step) {
		return {
			command: Object.keys(step)[0] as STEP,
			params: Object.values(step)[0] as U__plans_plan__step_Params
		}
	}

	static GetOnError(step: U__plans_plan__step): U__on_error_Params {
		const { params: stepParams } = Step.GetStepParams(step)
		return (stepParams as Record<string, unknown>)['on-error'] as U__on_error_Params
	}
}
