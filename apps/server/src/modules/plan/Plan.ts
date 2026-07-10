//
//
//
import { CustomEvent } from "@dimkl/events"
import { has, merge } from "lodash-es"
//
import { DataTable } from "../../types/DataTable"
import type { TJson } from "../../types/TJson"
import { Assert } from "../../utils/Assert"
import { JsonUtils } from "../../utils/JsonUtils"
import { Logger } from "../../utils/Logger"
import { SynchronizerManager } from "../../utils/SynchronizerManager"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { METADATA } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { HttpErrorInternalServerError, HttpErrorNotFound, NormalizeError } from "../errors/HttpErrors"
import { MetricsCollector } from "../metrics/MetricsCollector"
import type { TContext } from "../sandbox/types/TContext"
import type { TSchemaRequest, TSchemaRequestBase, TSchemaRequestSelect } from "../schema/types/TSchemaRequest"
import { DATA_PROVIDER } from "../source/@consts"
import { PLAN_FAILURE_STRATEGY, PLAN_STATUS, STEP_STATUS } from "./@consts"
import { PLAN_METRICS, PlanMetrics, type T_PlanMetrics } from "./PlanMetrics"
import { Step, type T_StepFunctionWithSignal } from "./Step"
import { type U__plans_plan, z_U__plans_plan } from "./types/U__plans"
import type { U__plans_plan__step } from "./types/U__plans_plan__step"
import type { U__on_error_Params } from "./types/U__plans_plan_on_error"
import type { U__schedules_schedule } from "./types/U__schedules"

//
export class Plan {
	Name: string // Plan name
	Config: U__plans_plan | null = null // Plan configuration

	_data: DataTable = new DataTable()

	get Metrics(): T_PlanMetrics {
		return PlanMetrics.Get(this.Name)
	}

	constructor(name: string) {
		this.Name = name
		void this.Init()
	}

	async Init() {
		this._data = new DataTable(this.Name, undefined, undefined, {
			persistant: true,
			batchSize: 100,
		})

		const planConfig = ConfigManager.Get<U__plans_plan>(`plans.${this.Name}`)
		if (planConfig) {
			this.Config = z_U__plans_plan.parse(planConfig)
		}
	}

	Dispose() {
		this._data.Dispose()
		this.Config = null
	}

	@Logger.LogFunction(["sqlQuery"])
	@SynchronizerManager.Synchronized()
	async ProcessSchemaRequest(schemaRequest: TSchemaRequest, sqlQuery?: string) {
		const { schema: callerSchema, source } = schemaRequest as TSchemaRequestSelect

		Assert.Var<string>(source, `no source found for ${callerSchema}`, new HttpErrorNotFound())
		Assert.Var<U__plans_plan>(this.Config, `plan '${this.Name}' not found or not configured`, new HttpErrorNotFound())

		const planData = await this.Process(callerSchema)
		await planData.FreeSql({ sqlQuery })

		return planData
	}

	@Logger.LogFunction(["sqlQuery"])
	@SynchronizerManager.Synchronized()
	async ProcessSchedule(schedule: U__schedules_schedule, sqlQuery?: string): Promise<void> {
		const { plan } = schedule

		Assert.Condition(plan !== null, `plan '${plan}' is not defined`)
		Assert.Var<U__plans_plan>(this.Config, `plan '${this.Name}' not found or not configured`)

		this.Process().then((data) => {
			data.FreeSql({ sqlQuery })
		})
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Process(callerSchema?: string): Promise<DataTable> {
		await this._data.RowsSet([])

		Assert.Var<NonNullable<U__plans_plan>>(this.Config, `plan '${this.Name}' not found or not configured`)

		const _metricsPlans: string[] = await MetricsCollector.Get("plans") ?? []
		if (!_metricsPlans.includes(this.Name)) {
			_metricsPlans.push(this.Name)
		}
		MetricsCollector.DispatchSetEvent("plans", _metricsPlans)

		const { steps, "on-error": planOnError, "failure-strategy": planFailureStrategy } = this.Config

		let $context: Partial<TContext> = {
			$schema: callerSchema,
			$plan: {
				name: this.Name,
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: this._data,
			},
			$vars: {},
		}

		PlanMetrics.Bus.dispatchEvent(
			new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_START, {
				data: {
					planName: this.Name,
					startTime: new Date(),
					status: PLAN_STATUS.RUNNING,
					steps: [],
				},
			}),
		)

		let stepIndex = 0
		let isPlanCompletedWithErrors = false

		while (stepIndex < steps.length) {
			try {
				const _step = steps[stepIndex]

				Assert.Var<U__plans_plan__step>(_step, "Step is not defined")
				Assert.Var<NonNullable<typeof $context.$plan>>($context.$plan, "Plan context is not defined")

				const { command: _stepCommand, params: _stepParams } = Step.GetStepParams(_step)

				// if step has no on-error, merge with plan.on-error
				if (_stepParams && (_stepParams as Record<string, unknown>)["on-error"] === undefined && planOnError) {
					;(_stepParams as Record<string, U__on_error_Params>)["on-error"] = planOnError
				}

				$context.$plan.currentStep = {
					...$context.$plan.currentStep,
					index: stepIndex,
					command: _stepCommand,
					params: _stepParams,
					status: STEP_STATUS.RUNNING,
				}

				Logger.Info(`${Logger.In} Plan.Process '${$context.$plan.name}', step ${stepIndex}: ${JsonUtils.Stringify(_step)}`)

				// check loop detection
				// TODO: recheck
				const { schema: _stepParamSchema, entity: _stepParamEntity } = $context.$plan.currentStep
					.params as TSchemaRequestBase

				Assert.Condition(
					_stepParamSchema !== DATA_PROVIDER.PLANS && _stepParamEntity !== this.Name,
					`'${$context.$plan.name}': loop detected in step ${$context.$plan.currentStep.index}`,
				)

				Assert.Var<DataTable>(
					this._data,
					`'${$context.$plan.name}': error have been encountered in step ${$context.$plan.currentStep.index}`,
				)

				const _stepFunction = Step.ExecuteCaseMap[_stepCommand]

				Assert.Var<T_StepFunctionWithSignal>(
					_stepFunction,
					`'${$context.$plan.name}': error have been encountered in step ${$context.$plan.currentStep.index}`,
					new HttpErrorInternalServerError(),
				)

				const _stepOutput = await _stepFunction(_stepParams, $context)

				if (_stepOutput.data) {
					this._data = _stepOutput.data
				}

				$context = merge($context, <Partial<TContext>>{
					$plan: {
						currentStep: {
							status: STEP_STATUS.SUCCESS,
						},
						data: this._data,
					},
				})

				// Check for stop signal to halt execution
				if (_stepOutput.signal === "stop") {
					PlanMetrics.Bus.dispatchEvent(
						new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_END, {
							data: {
								planName: this.Name,
								endTime: new Date(),
								status: PLAN_STATUS.COMPLETED,
							},
						}),
					)

					Logger.Info(
						`${Logger.Out} Plan.Process '${this.Name}': stop signal at step '${stepIndex}', ${JsonUtils.Stringify(_stepCommand)}`,
					)
					break
				}
			} catch (e: unknown) {
				const _e = NormalizeError(e)

				Assert.Var<NonNullable<typeof $context.$plan>>($context.$plan, "Plan context is not defined")
				Assert.Var<DataTable>(this._data, `'${this.Name}': Data is not set`)

				const { command: _stepCommand, params: _stepParams } = $context.$plan.currentStep

				// trace error if debug enabled
				if (this._data.MetaData[METADATA.PLAN_DEBUG] === "error") {
					// TODO In case of cross entities, only errors in the final entity are returned.  Console log is working fine.
					const _planErrors: TJson = {
						[`plan(${this.Name}), step(${stepIndex})`]: _stepCommand,
					}

					Logger.Debug(
						`${Logger.Out} Plan.Process '${this.Name}': step '${stepIndex},${JsonUtils.Stringify(_stepParams)}' added error ${JsonUtils.Stringify((<TJson[]>this._data.MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`,
					)
				}

				$context = merge($context, <Partial<TContext>>{
					$plan: {
						currentStep: {
							status: STEP_STATUS.FAILED,
						},
						data: this._data,
					},
				})

				const _errMessage = `'${this.Name}': error have been encountered in step ${stepIndex}, ${_stepCommand}, ${JsonUtils.Stringify(_stepParams)}': ${JsonUtils.Stringify(_e.message)}`

				Logger.Error(_errMessage)

				switch (planFailureStrategy) {
					case PLAN_FAILURE_STRATEGY.DATA_ERRORS:
						// Add error metadata to data before returning
						if (!this._data.MetaData[METADATA.PLAN_ERRORS]) {
							this._data.MetaData[METADATA.PLAN_ERRORS] = []
						}
						;(this._data.MetaData[METADATA.PLAN_ERRORS] as TJson[]).push({
							step: stepIndex,
							command: _stepCommand,
							error: _e.message,
							timestamp: new Date().toISOString(),
						})
						isPlanCompletedWithErrors = true
						break

					case PLAN_FAILURE_STRATEGY.DATA:
						isPlanCompletedWithErrors = true
						break

					case PLAN_FAILURE_STRATEGY.THROW:
					default:
						PlanMetrics.Bus.dispatchEvent(
							new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_END, {
								data: {
									planName: this.Name,
									endTime: new Date(),
									status: PLAN_STATUS.FAILED,
								},
							}),
						)

						throw new HttpErrorInternalServerError(_errMessage)
				}
			}
			stepIndex++
		}

		PlanMetrics.Bus.dispatchEvent(
			new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_END, {
				data: {
					planName: this.Name,
					endTime: new Date(),
					status: isPlanCompletedWithErrors ? PLAN_STATUS.COMPLETED_WITH_ERRORS : PLAN_STATUS.COMPLETED,
				},
			}),
		)

		Logger.Info(`${Logger.Out} Plan.Process '${this.Name}': completed`)

		return this._data
	}

	@Logger.LogFunction()
	async Reload(plan: string, userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
		Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

		const configFileJson = await ConfigManager.Load()

		// check if plan exist
		if (ConfigManager.Has(`plans.${plan}`) && has(configFileJson.plans, plan)) {
			ConfigManager.Set(`plans.${plan}`, configFileJson.plans[plan])
			if (configFileJson.schedules) {
				ConfigManager.Set("schedules", configFileJson.schedules)
			}
			this.Dispose()
			await this.Init()

			return HttpResponse.Ok({
				plan,
				message: `Plan reloaded`,
			})
		}

		// plan not found
		throw new HttpErrorNotFound(`Plan '${plan}' not found`)
	}
}
