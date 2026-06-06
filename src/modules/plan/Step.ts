/** biome-ignore-all lint/complexity/noUselessSwitchCase: All cases are intentionally handled for completeness */
//
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
import {
	STEP,
	STEP_ON_ERROR_RETRY_AFTER_RETRIES,
	STEP_ON_ERROR_RETRY_BACKOFF,
	STEP_ON_ERROR_SCOPE,
	STEP_ON_ERROR_STRATEGY,
	STEP_OUTCOME,
	STEP_SIGNAL,
	STEP_STATUS,
} from "./@consts"
import type { T_StepMetrics } from "./PlanMetrics"
import { PLAN_METRICS, PlanMetrics } from "./PlanMetrics"
import { Insert } from "./steps/Insert"
import type { T_StepErrorDetails } from "./T_StepErrorDetails"
import type { T_StepResult } from "./types/T_StepResult"
import type { U__plans_plan_insert_Params } from "./types/U__plans_params"
import type { U__plans_plan__step, U__plans_plan__step_Params } from "./types/U__plans_plan__step"
import type {
	U__on_error_Params,
	U__on_error_strategy_retry,
	U__on_error_strategy_sink,
} from "./types/U__plans_plan_on_error"

//
export type T_StepFunctionWithSignal = (
	stepParams: U__plans_plan__step_Params,
	$context: Partial<TContext>,
) => Promise<T_StepResult>
export type T_StepFunction = (
	stepParams: U__plans_plan__step_Params,
	$context: Partial<TContext>,
) => Promise<DataTable | undefined>
export type T_RowFunction = (
	row: TRow,
	stepParams: U__plans_plan__step_Params,
	$context: Partial<TContext>,
) => Promise<TRow>

type T_StepOnErrorArgs = {
	fnStep?: T_StepFunction
	fnRow?: T_RowFunction
	stepParams: U__plans_plan__step_Params
	onError?: U__on_error_Params
	$context: Partial<TContext>
	attempt: number
	row?: TRow
	error?: Error
}

//
export class Step {
	@Logger.LogFunction()
	static readonly ExecuteCaseMap: Record<string, T_StepFunctionWithSignal> = {
		// flow functions
		[STEP.BREAK]: async (stepParams, $context) => {
			const result = await (await import("./steps/Break")).Break(stepParams, $context)

			const signal = result ? STEP_SIGNAL.STOP : STEP_SIGNAL.NEXT

			return <T_StepResult>{
				data: undefined,
				signal,
				outcome: STEP_OUTCOME.SUCCESS,
				$context,
			}
		},
		[STEP.DEBUG]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/Debug")).Debug(stepParams, $context),
		),
		[STEP.SET_VAR]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/SetVar")).SetVar(stepParams, $context),
		),
		[STEP.CLEAR]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/Clear")).Clear(stepParams, $context),
		),

		// data functions
		[STEP.LIST_ENTITIES]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/ListEntities")).ListEntities(stepParams, $context),
		),
		[STEP.SELECT]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/Select")).Select(stepParams, $context),
		),
		[STEP.UPDATE]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/Update")).Update(stepParams, $context),
		),
		[STEP.DELETE]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/Delete")).Delete(stepParams, $context),
		),
		[STEP.JOIN]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/Join")).Join(stepParams, $context),
		),
		[STEP.SYNC]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/Sync")).Sync(stepParams, $context),
		),
		[STEP.REMOVE_DUPLICATE]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/RemoveDuplicates")).RemoveDuplicates(stepParams, $context),
		),
		[STEP.SORT]: Step.WrapStepWithSignal(async (stepParams, $context) =>
			(await import("./steps/Sort")).Sort(stepParams, $context),
		),

		// with row function
		[STEP.INSERT]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import("./steps/Insert")).Insert(stepParams, $context),
			async (row, stepParams, $context) => (await import("./steps/Insert"))._insertRow(row, stepParams, $context),
		),
		[STEP.FIELDS]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import("./steps/Pick")).Pick(stepParams, $context),
			async (row, stepParams, $context) => (await import("./steps/Pick"))._pickRow(row, stepParams, $context),
		),
		[STEP.RUN]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import("./steps/Run")).Run(stepParams, $context),
			async (row, stepParams, $context) => (await import("./steps/Run"))._runRow(row, stepParams, $context),
		),
		[STEP.ANONYMIZE]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import("./steps/Anonymize")).Anonymize(stepParams, $context),
			async (row, stepParams, $context) => (await import("./steps/Anonymize"))._anonymizeRow(row, stepParams, $context),
		),
		[STEP.PICK]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import("./steps/Pick")).Pick(stepParams, $context),
			async (row, stepParams, $context) => (await import("./steps/Pick"))._pickRow(row, stepParams, $context),
		),
		[STEP.OMIT]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import("./steps/Omit")).Omit(stepParams, $context),
			async (row, stepParams, $context) => (await import("./steps/Omit"))._omitRow(row, stepParams, $context),
		),
		[STEP.MAP]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import("./steps/MapRows")).MapRows(stepParams, $context),
			async (row, stepParams, $context) => (await import("./steps/MapRows"))._mapRow(row, stepParams, $context),
		),
		[STEP.REMOVE_EMPTY_FIELDS]: Step.WrapStepWithSignal(
			async (stepParams, $context) => (await import("./steps/RemoveEmptyFields")).RemoveEmptyFields(stepParams, $context),
			async (row, stepParams, $context) =>
				(await import("./steps/RemoveEmptyFields"))._removeEmptyFieldsRow(row, stepParams, $context),
		),
	}

	static WrapStepWithSignal(
		fnStep: T_StepFunction,
		fnRow?: T_RowFunction,
		signal: STEP_SIGNAL = STEP_SIGNAL.NEXT,
	): T_StepFunctionWithSignal {
		return async (stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<T_StepResult> => {
			const onError = (stepParams as Record<string, unknown>)["on-error"] as U__on_error_Params | undefined

			const stepIndex = $context.$plan?.currentStep.index
			const planName = $context.$plan?.name

			PlanMetrics.Bus.dispatchEvent(
				new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_START, {
					detail: {
						planName,
						index: stepIndex,
						step: {
							startTime: new Date(),
						},
						attemptCount: 1,
						rows: {
							input: (await $context.$plan?.data?.Count()) ?? 0,
						},
					},
				}),
			)

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
					attempt: 1,
				})
			}

			try {
				const data = await _fnStepRouter()

				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_END, {
						detail: {
							planName,
							index: stepIndex,
							step: {
								endTime: new Date(),
								status: STEP_STATUS.SUCCESS,
							},
						},
					}),
				)

				return <T_StepResult>{
					data,
					signal,
					outcome: STEP_OUTCOME.SUCCESS,
					$context,
				}
			} catch (error) {
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_END, {
						detail: {
							planName,
							index: stepIndex,
							step: {
								endTime: new Date(),
								status: STEP_STATUS.FAILED,
							},
						},
					}),
				)

				return <T_StepResult>{
					data: undefined,
					signal,
					outcome: STEP_OUTCOME.FAILED,
					$context,
					error,
				}
			}
		}
	}
	static async OnError({
		fnStep,
		fnRow = undefined,
		stepParams,
		onError,
		$context,
		attempt,
		error,
	}: T_StepOnErrorArgs): Promise<DataTable | undefined> {
		if (!onError) return $context.$plan?.data

		// Update error context with current attempt for metrics tracking
		if ($context) {
			const existingError = $context.$error
			$context.$error = {
				message: existingError?.message || "",
				type: existingError?.type || "",
				timestamp: existingError?.timestamp || new Date().toISOString(),
				attempt,
				step: existingError?.step,
			}
		}

		switch (onError.scope) {
			case STEP_ON_ERROR_SCOPE.ROW:
				return Step.OnErrorRow({
					fnRow,
					stepParams,
					onError,
					$context,
					attempt,
					error,
				} as T_StepOnErrorArgs).then((result) => result.CleanForDeletion())

			case STEP_ON_ERROR_SCOPE.STEP:
			default:
				return Step.OnErrorStep({
					fnStep,
					stepParams,
					onError,
					$context,
					attempt,
					error,
				})
		}
	}

	static async OnErrorStep({
		fnStep,
		stepParams,
		onError,
		$context,
		attempt,
	}: T_StepOnErrorArgs): Promise<DataTable | undefined> {
		if ($context?.$error) {
			$context.$error.attempt = attempt
		}

		Assert.Var<T_StepFunction>(fnStep, "fnStep is undefined")

		const strategy = onError?.strategy ?? undefined

		return fnStep(stepParams, $context)
			.then(async (data) => {
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
						detail: {
							planName: $context.$plan?.name,
							index: $context.$plan?.currentStep?.index,
							rows: {
								passed: await data?.Count(),
							},
						},
					}),
				)
				return data
			})
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
							error: caughtError as Error,
						})

					case STEP_ON_ERROR_STRATEGY.SKIP:
						return Step._onErrorStepSkip({
							$context,
							attempt,
						})

					case STEP_ON_ERROR_STRATEGY.THROW:
					default:
						return Step._onErrorStepThrow({
							$context,
							attempt,
							error: caughtError as Error,
						})
				}
			})
	}

	static async _onErrorStepThrow({
		$context,
		attempt,
		error,
	}: Pick<T_StepOnErrorArgs, "$context" | "attempt" | "error">): Promise<DataTable | undefined> {
		const planName = $context.$plan?.name
		const currentStep = $context.$plan?.currentStep

		// Inject $error into context for next step
		const errorDetails = Step._errorToJson(error, attempt, $context)
		if ($context) {
			$context.$error = errorDetails
		}

		PlanMetrics.Bus.dispatchEvent(
			new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
				detail: {
					planName,
					index: currentStep?.index,
					attemptCount: attempt,
					rows: {
						failed: (await $context.$plan?.data?.Count()) ?? 0,
					},
				},
			}),
		)

		Logger.Warn(
			`Plan '${planName}', step ${currentStep?.index} threw an error after ${attempt} attempt(s): ${errorDetails}`,
		)
		throw new HttpErrorInternalServerError(
			`Plan '${planName}', step ${currentStep?.index} threw an error after ${attempt} attempt(s): ${errorDetails}`,
		)
	}

	static async _onErrorStepSkip({
		$context,
		attempt,
		error,
	}: Pick<T_StepOnErrorArgs, "$context" | "attempt" | "error">): Promise<DataTable> {
		const planName = $context.$plan?.name
		const currentStep = $context.$plan?.currentStep
		const data = $context.$plan?.data

		Assert.Var<DataTable>(data, "data is not defined")

		// Inject $error into context for next step
		const errorDetails = Step._errorToJson(error, attempt, $context)
		if ($context) {
			$context.$error = errorDetails
		}

		PlanMetrics.Bus.dispatchEvent(
			new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_START, {
				detail: {
					planName,
					index: currentStep?.index,
					attemptCount: attempt,
					rows: {
						skipped: (await $context.$plan?.data?.Count()) ?? 0,
					},
				},
			}),
		)

		Logger.Warn(`Plan '${planName}', step ${currentStep?.index} skipped after ${attempt} attempt(s) ${errorDetails}`)
		return data
	}

	static async _onErrorStepRetry({
		fnStep,
		stepParams,
		onError,
		$context,
		attempt,
		error,
	}: Pick<T_StepOnErrorArgs, "fnStep" | "stepParams" | "onError" | "$context" | "attempt" | "error">): Promise<
		DataTable | undefined
	> {
		const { retry } = onError as U__on_error_strategy_retry

		if (!retry) {
			return await Step._onErrorStepThrow({
				$context,
				attempt,
				error: error || new Error("Unknown error during retry"),
			})
		}

		const { attempts, delay, backoff, "after-retries": afterRetries, "max-delay": maxDelay } = retry

		const planName = $context.$plan?.name
		const currentStep = $context.$plan?.currentStep

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
				attempt: nextAttempt,
			})
		}

		// Apply fallback strategy after retries are exhausted
		switch (afterRetries) {
			case STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP:
				return Step._onErrorStepSkip({
					$context,
					attempt,
					error,
				})
			case STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW:
			default:
				return Step._onErrorStepThrow({
					$context,
					attempt,
					error,
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
		error,
	}: Pick<
		T_StepOnErrorArgs,
		"fnRow" | "stepParams" | "onError" | "$context" | "attempt" | "row" | "error"
	>): Promise<DataTable> {
		Assert.Var<DataTable>($context.$plan?.data, "Plan data is undefined")

		if (!fnRow) {
			return $context.$plan?.data
		}

		const strategy = onError?.strategy

		return await $context.$plan?.data.RowsMap(async (row) => {
			return fnRow(row, stepParams, $context)
				.then((row) => {
					PlanMetrics.Bus.dispatchEvent(
						new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
							detail: {
								planName: $context.$plan?.name,
								index: $context.$plan?.currentStep?.index,
								attemptCount: attempt,
								rows: {
									passed: 1,
								},
							},
						}),
					)
					return row
				})
				.catch((caughtError) => {
					switch (strategy) {
						case STEP_ON_ERROR_STRATEGY.SINK:
							return Step._onErrorRowSink({
								onError,
								$context,
								attempt,
								row,
								error: caughtError,
							})

						case STEP_ON_ERROR_STRATEGY.RETRY:
							return Step._onErrorRowRetry({
								fnRow,
								stepParams,
								onError,
								$context,
								attempt,
								row,
								error: caughtError,
							})

						case STEP_ON_ERROR_STRATEGY.SKIP:
						default:
							return Step._onErrorRowSkip({
								$context,
								attempt,
								row,
							})
					}
				})
		})
	}

	static async _onErrorRowSkip({
		$context,
		attempt,
		row,
	}: Pick<T_StepOnErrorArgs, "$context" | "attempt" | "row">): Promise<TRow> {
		const planName = $context.$plan?.name
		const currentStep = $context.$plan?.currentStep

		// Inject $error into context for next step (row-level errors also set context)
		if ($context) {
			// For row-level errors, we create a generic error since we don't have the specific error
			$context.$error = {
				message: "Row processing skipped due to error",
				type: "RowProcessingError",
				timestamp: new Date().toISOString(),
				attempt: attempt,
				step: currentStep
					? {
							index: currentStep.index,
							command: currentStep.command,
							params: currentStep.params,
						}
					: undefined,
			}
		}

		PlanMetrics.Bus.dispatchEvent(
			new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
				detail: {
					planName,
					index: currentStep?.index,
					attemptCount: attempt,
					rows: {
						skipped: 1,
					},
				},
			}),
		)

		Logger.Warn(`Plan '${planName}', step ${currentStep?.index} skipped row after ${attempt} attempt(s)`)
		return row!
	}

	static async _onErrorRowSink({
		onError,
		$context,
		attempt,
		row,
		error,
	}: Pick<T_StepOnErrorArgs, "onError" | "$context" | "attempt" | "row" | "error">): Promise<TRow> {
		const { sink } = onError as U__on_error_strategy_sink

		const { "include-error": includeError, "error-field": errorField, schema, entity } = sink

		// TODO: row add err
		Assert.Var<TRow>(row, "row is undefined")

		const errorDetails = Step._errorToJson(error, attempt, $context)

		// Inject $error into context for next step
		if ($context) {
			$context.$error = errorDetails
		}

		const _rowWithError = includeError
			? {
					...row, // Spread original row fields directly
					[errorField]: errorDetails,
				}
			: row

		// insert
		const _insertParams: U__plans_plan_insert_Params = {
			schema,
			entity,
			data: [_rowWithError],
		}

		const { __idx__ } = row

		Assert.Var<TUuidv7>(__idx__, "row index is undefined")

		return Insert(_insertParams, $context)
			.then(() => {
				if ($context.$plan?.data) {
					$context.$plan.data.RowMarkForDeletion(__idx__)
				}
			})
			.then(() => {
				PlanMetrics.Bus.dispatchEvent(
					new CustomEvent<Partial<T_StepMetrics>>(PLAN_METRICS.STEP_INC, {
						detail: {
							planName: $context.$plan?.name,
							index: $context.$plan?.currentStep?.index,
							rows: {
								sunk: 1,
							},
						},
					}),
				)
				return row
			})
			.catch(() => row)
	}

	static async _onErrorRowRetry({
		fnRow,
		stepParams,
		onError,
		$context,
		attempt,
		row,
		error,
	}: Pick<
		T_StepOnErrorArgs,
		"fnRow" | "stepParams" | "onError" | "$context" | "attempt" | "row" | "error"
	>): Promise<TRow> {
		const { retry } = onError as U__on_error_strategy_retry

		Assert.Var(retry, "retry is undefined")

		const { attempts, delay, backoff, "after-retries": afterRetries, "max-delay": maxDelay } = retry

		const planName = $context.$plan?.name
		const currentStep = $context.$plan?.currentStep

		const retryDelay = Step._calculateRetryDelay(attempt, delay, backoff, maxDelay)

		const nextAttempt = attempt + 1

		if (nextAttempt <= attempts) {
			Logger.Warn(`Plan '${planName}', step ${currentStep?.index}:attempt ${nextAttempt}, retrying after ${retryDelay}ms`)
			await Utils.Sleep(retryDelay)

			Assert.Var<T_RowFunction>(fnRow, "fnRow is undefined during retry")

			try {
				Assert.Var<TRow>(row, "row is undefined during retry")
				const retryRow = await fnRow(row, stepParams, $context)
				return { data: retryRow, metrics: { passed: 1 } }
			} catch (retryError) {
				// If retry still fails, recursively call to continue retry logic
				return Step._onErrorRowRetry({
					fnRow,
					stepParams,
					onError,
					$context,
					attempt: nextAttempt,
					row,
					error: retryError as Error,
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
					error,
				})

			case STEP_ON_ERROR_RETRY_AFTER_RETRIES.SKIP:
			default:
				return Step._onErrorRowSkip({
					$context,
					attempt,
					row,
				})
		}
	}

	static _calculateRetryDelay(
		attempt: number,
		baseDelay: number,
		backoff: STEP_ON_ERROR_RETRY_BACKOFF,
		maxDelay: number,
	): number {
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

	static _errorToJson(error: Error | undefined, attempt: number, $context: Partial<TContext>): T_StepErrorDetails {
		const normalizedError = NormalizeError(error)
		const currentStep = $context.$plan?.currentStep

		return {
			message: normalizedError?.message,
			type: normalizedError?.name,
			timestamp: new Date().toISOString(),
			attempt: attempt,
			step: {
				index: currentStep?.index,
				command: currentStep?.command,
				params: currentStep?.params,
			},
		}
	}

	static GetStepParams(step: U__plans_plan__step) {
		return {
			command: Object.keys(step)[0] as STEP,
			params: Object.values(step)[0] as U__plans_plan__step_Params,
		}
	}

	static GetOnError(step: U__plans_plan__step): U__on_error_Params {
		const { params: stepParams } = Step.GetStepParams(step)
		return (stepParams as Record<string, unknown>)["on-error"] as U__on_error_Params
	}
}
