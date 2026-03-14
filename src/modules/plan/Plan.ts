//
//
//
import { forEach, has, keys, merge, values } from "lodash-es"
//
import { DataBase } from "../../types/DataBase"
import type { DataTable } from "../../types/DataTable"
import type { TJson } from "../../types/TJson"
import { Assert } from "../../utils/Assert"
import { JsonUtils } from "../../utils/JsonUtils"
import { Logger } from "../../utils/Logger"
import { SynchronizerManager } from "../../utils/SynchronizerManager"
import { Utils } from "../../utils/Utils"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { METADATA } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { HttpErrorInternalServerError, HttpErrorNotFound, NormalizeError } from "../errors/HttpErrors"
import type { TContext } from "../sandbox/types/TContext"
import type { TSchemaRequest, TSchemaRequestBase, TSchemaRequestSelect } from "../schema/types/TSchemaRequest"
import { type STEP, STEP_STATUS } from "./@consts"
import { Step, type TFunctionStep } from "./Step"
import type { TStep } from "./types/TStep"
import type { U__plans_plan } from "./types/U__plans"
import type { U__plans_plan__step_Params } from "./types/U__plans_plan__step"
import type { U__schedules_schedule } from "./types/U__schedules"


//
export class Plan {

	Name: string // Plan name
	Entities = new Map<string, U__plans_plan[string]>() // Plan entities and associated config
	_dataBase: DataBase // Plan entities rendered data
	_isReady = false

	constructor(name: string) {
		this.Name = name
		this._dataBase = new DataBase(this.Name, true)
	}

	async Init() {
		await this._dataBase.Init()
			.catch((e) => {
				const _e = NormalizeError(e)
				throw new HttpErrorInternalServerError(`Unable to set temporary database for plan ${this.Name}: ${_e.message}`)
			})

		const entities = ConfigManager.Get<U__plans_plan>(`plans.${this.Name}`) ?? {}

		forEach(entities, (config: U__plans_plan[string], entity: string) => {
			this.Entities.set(entity, config)
		})

		this._isReady = true
	}

	async Disconnect() {
		this._isReady = false
		await this._dataBase.Disconnect()
		this.Entities.clear()
	}

	async ProcessSchemaRequest(schemaRequest: TSchemaRequest, sqlQuery?: string) {
		await Utils.Wait(async () => this._isReady, 50, 60_000)

		const { schema, source, entity } = schemaRequest as TSchemaRequestSelect

		Assert.Var<string>(source, `no source found for ${schema}`, new HttpErrorNotFound())
		Assert.Condition(
			this.Entities.has(entity),
			`entity '${entity}' not found in plan ${this.Name}`,
			new HttpErrorNotFound(),
		)

		const currentDatatable = await this.Process(schema, source, entity, this.Entities.get(entity)!)
		await currentDatatable.FreeSql({ sqlQuery })
		Logger.Debug(`${Logger.Out} Plan.ProcessSchemaRequest: ${source}.${entity}`)
		return currentDatatable
	}

	async ProcessSchedule(schemaRequest: U__schedules_schedule, sqlQuery?: string): Promise<void> {
		await Utils.Wait(async () => this._isReady, 50, 60_000)

		const { plan, entity } = schemaRequest

		Assert.Condition(plan !== null, `plan '${plan}' is not defined`)
		Assert.Condition(entity !== null, `entity '${entity}' is not defined`)
		Assert.Condition(
			this.Entities.has(entity),
			`entity '${entity}' not found in plan ${this.Name}`
		)

		Logger.Debug(`${Logger.In} Plan.ProcessSchedule: ${plan}.${entity}`)

		this.Process(undefined, plan, entity, this.Entities.get(entity)!)
			.then((data) => {
				data.FreeSql({ sqlQuery }).then(() => {
					Logger.Debug(`${Logger.Out} Plan.ProcessSchedule: ${plan}.${entity}`)
				})
			})
			.catch((e) => {
				Logger.Error(`${Logger.Out} Plan.ProcessSchedule: ${plan}.${entity}: ${e}`)
			})
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Process(
		currentSchemaName: string | undefined,
		currentPlanName: string,
		currentEntityName: string,
		entityConfig: U__plans_plan[string],
	): Promise<DataTable> {

		this._dataBase.SetTable(currentEntityName, [])

		const { steps, "on-error": entityOnErrorConfig } = entityConfig

		let $context: Partial<TContext> = {
			$plan: {
				name: currentPlanName,
				schema: currentSchemaName,
				entity: currentEntityName,
				$current: {
					data: this._dataBase.Tables[currentEntityName],
					status: STEP_STATUS.PENDING,
					stepIndex: undefined,
					stepCommand: undefined,
					stepArgs: undefined,
				},
			},
			$vars: {},
		}

		try {
			for (const [_stepIndex, _step] of Object.entries(steps)) {

				const __stepIndex = Number.parseInt(_stepIndex, 10) + 1

				Assert.Var<NonNullable<typeof $context.$plan>>($context.$plan, "Plan context is not defined")

				$context.$plan.$current = {
					...$context.$plan.$current,
					stepIndex: __stepIndex,
					stepCommand: keys(_step)[0] as STEP,
					stepArgs: values(<U__plans_plan__step_Params>_step)[0] as U__plans_plan__step_Params,
					status: STEP_STATUS.RUNNING,
				}

				Logger.Info(
					`${Logger.In} Plan.Run '${$context.$plan.name}', Entity '${$context.$plan.entity}', step ${$context.$plan.$current.stepIndex}: ${JsonUtils.Stringify(_step)}`,
				)

				// check loop detection
				const { schema: __argSchema, entity: __argEntity } = $context.$plan.$current.stepArgs as TSchemaRequestBase
				const { schema: __planSchema, entity: __planEntity } = $context.$plan

				Assert.Condition(
					__argSchema !== __planSchema || __argEntity !== __planEntity,
					`'${$context.$plan.name}', Entity '${$context.$plan.entity}': loop detected in step ${$context.$plan.$current.stepIndex}`
				)

				// check step validity
				Assert.Condition(
					_step !== null,
					`'${$context.$plan.name}', Entity '${$context.$plan.entity}': error have been encountered in step ${$context.$plan.$current.stepIndex}`
				)

				Assert.Var<DataTable>(
					this._dataBase.Tables[currentEntityName],
					`'${$context.$plan.name}', Entity '${$context.$plan.entity}': error have been encountered in step ${$context.$plan.$current.stepIndex}`
				)

				const __stepArguments: TStep = <TStep>{
					currentSchemaName: $context.$plan.schema!,
					currentPlanName: $context.$plan.name,
					currentDataTable: this._dataBase.Tables[currentEntityName],
					stepArgs: $context.$plan.$current.stepArgs!,
				}

				const __executeStep = Step.ExecuteCaseMap[$context.$plan.$current.stepCommand!]

				Assert.Var<TFunctionStep>(
					__executeStep,
					`'${$context.$plan.name}', Entity '${$context.$plan.entity}': error have been encountered in step ${$context.$plan.$current.stepIndex}`,
					new HttpErrorInternalServerError(),
				)

				const __stepReturn = await Step.ExecuteOnError(
					__executeStep,
					__stepArguments,
					$context,
					_step,
					entityOnErrorConfig
				)

				if (__stepReturn) {
					this._dataBase.Tables[currentEntityName] = __stepReturn
				}

				$context = merge($context, <Partial<TContext>>{
					$plan: {
						$current: {
							data: this._dataBase.Tables[currentEntityName],
							status: STEP_STATUS.COMPLETED,
						},
					},
				})
			}
		} catch (e: unknown) {
			const _e = NormalizeError(e)

			Assert.Var<NonNullable<typeof $context.$plan>>($context.$plan, "Plan context is not defined")

			switch (true) { // NOSONAR
				case _e.message === "__BREAK__":
					Logger.Info(
						`${Logger.Out} Plan.Process '${$context.$plan.name}', Entity '${$context.$plan.entity}': user break at step '${$context.$plan.$current.stepIndex}', ${JsonUtils.Stringify($context.$plan.$current.stepCommand)}`,
					)

					$context = merge($context, <Partial<TContext>>{
						$plan: {
							$current: {
								status: STEP_STATUS.COMPLETED,
							},
						},
					})
					break

				default: {
					Assert.Var<DataTable>(
						this._dataBase.Tables[currentEntityName],
						`'${$context.$plan.name}', Entity '${$context.$plan.entity}': Data is not set`,
					)

					// trace error if debug enabled
					if (this._dataBase.Tables[currentEntityName].MetaData[METADATA.PLAN_DEBUG] === "error") {
						// TODO In case of cross entities, only errors in the final entity are returned.  Console log is working fine.
						const _planErrors: TJson = {
							[`entity(${$context.$plan.entity}), step(${$context.$plan.$current.stepIndex})`]:
								$context.$plan.$current.stepCommand,
						}

						Logger.Debug(
							`${Logger.Out} Plan.Run '${$context.$plan.name}', Entity '${$context.$plan.entity}': step '${$context.$plan.$current.stepIndex},${JsonUtils.Stringify($context.$plan.$current.stepArgs)}' added error ${JsonUtils.Stringify((<TJson[]>this._dataBase.Tables[currentEntityName].MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`,
						)
					}

					$context = merge($context, <Partial<TContext>>{
						$plan: {
							$current: {
								data: this._dataBase.Tables[currentEntityName],
								status: STEP_STATUS.FAILED,
							},
						},
					})

					throw new HttpErrorInternalServerError(
						`'${$context.$plan?.name}', Entity '${$context.$plan?.entity}': stopped at step '${$context.$plan?.$current.stepIndex},${JsonUtils.Stringify($context.$plan?.$current.stepCommand)}' because of error: ${JsonUtils.Stringify(_e?.message)}`,
					)
				}
			}
		}

		Assert.Var<DataTable>(
			this._dataBase.Tables[currentEntityName],
			`'${$context.$plan?.name}', Entity '${$context.$plan?.entity}': error have been encountered in step ${$context.$plan?.$current.stepIndex}`
		)

		return this._dataBase.Tables[currentEntityName].Rename($context.$plan?.entity ?? "")
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
			await this.Disconnect()
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
