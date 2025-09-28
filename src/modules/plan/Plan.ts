//
//
//
import forEach from "lodash/forEach"
import has from "lodash/has"
import keys from "lodash/keys"
import merge from "lodash/merge"
import values from "lodash/values"
import typia from "typia"
//
import { DataTable } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { Helper } from "../../utils/Helper"
import { JsonUtils } from "../../utils/JsonUtils"
import { Logger } from "../../utils/Logger"
import { SynchronizerManager } from "../../utils/SynchronizerManager"
import { AUTH_PERMISSION } from "../auth/@consts"
import { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { METADATA } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { HttpResponse } from "../core/HttpResponse"
import { StepCommand } from "../core/types/TConfig"
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound } from "../errors/HttpErrors"
import { WarnError } from "../errors/InternalError"
import { TContext } from "../sandbox/types/TContext"
import { TInternalResponse } from "../schema/types/TInternalResponse"
import { TSchemaRequest } from "../schema/types/TSchemaRequest"
import { STEP, STEP_STATUS } from "./@consts"
import { Step, TFunctionStep } from "./Step"
import { TScheduleConfig } from './types/TScheduleConfig'
import { TStep } from "./types/TStep"
import { DataBase } from "../../types/DataBase"
import { Assert } from "../../utils/Assert"
import { TStepArgs } from "./types/TStepArgs"


//
export class Plan {

    Name: string                                    // Plan name
    Entities = new Map<string, StepCommand[]>()     // Plan entities and associated steps
    _dataBase: DataBase                              // Plan entities rendered data
    // SemaphoreSize: number
    // #__LOCK__ = new Map<string, Semaphore>()       // Plan Lock by entity

    constructor(name: string) {
        this.Name = name
        this._dataBase = new DataBase(this.Name)
        // this.SemaphoreSize = 1                      // Force to have single thread of execution
        // this.#__LOCK__ = new Semaphore(this.SemaphoreSize)
    }

    async Init() {
        const entities = ConfigManager.Get<TJson<StepCommand[]>>(`plans.${this.Name}`) ?? {}

        forEach(entities, (steps: StepCommand[], entity: string) => {
            this.Entities.set(entity, steps)
            // this.#__LOCK__.set(entity, new Semaphore(this.SemaphoreSize))
        })
    }

    async ProcessSchemaRequest(schemaRequest: TSchemaRequest, sqlQuery?: string) {

        const { schema, source, entity } = schemaRequest

        Assert.Var<string>(source, `Plan.Execute: no source found for ${schema}`, new HttpErrorNotFound())
        Assert.Condition(this.Entities.has(entity), `Plan.Execute: entity '${entity}' not found in plan ${this.Name}`, new HttpErrorNotFound())

        const currentDatatable = await this.ExecuteSteps(
            schema,
            source,
            entity,
            this.Entities.get(entity)!
        )

        await currentDatatable.FreeSqlAsync(sqlQuery)

        Logger.Debug(`${Logger.Out} Plan.Execute: ${source}.${entity}`)
        return currentDatatable
    }

    async ProcessScheduleConfig(schemaRequest: TScheduleConfig, sqlQuery?: string): Promise<void> {

        const { plan, entity } = schemaRequest

        Assert.Condition(plan !== null, `Plan.Execute: plan '${plan}' is not defined`, new HttpErrorBadRequest())
        Assert.Condition(entity !== null, `Plan.Execute: entity '${entity}' is not defined`, new HttpErrorBadRequest())
        Assert.Condition(this.Entities.has(entity), `Plan.Execute: entity '${entity}' not found in plan ${this.Name}`, new HttpErrorBadRequest())

        const entitySteps: Array<StepCommand> = ConfigManager.Get(`plans.${plan}.${entity}`)

        Logger.Debug(`${Logger.In} Plan.Execute: ${plan}.${entity}: ${JsonUtils.Stringify(entitySteps)}`)

        this.ExecuteSteps(undefined, plan, entity, entitySteps)
            .then((data) => {
                data.FreeSqlAsync(sqlQuery)
                    .then(() => {
                        Logger.Debug(`${Logger.Out} Plan.Execute: ${plan}.${entity}`)
                    })
            })
    }

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized()
    async ExecuteSteps(currentSchemaName: string | undefined, currentPlanName: string, currentEntityName: string, steps: Array<StepCommand>): Promise<DataTable> {

        this._dataBase.SetTable(currentEntityName, [])

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
                    stepArgs: undefined
                }
            }
        }

        // await this.#__LOCK__.get($context.$plan!.entity)!.Acquire()

        try {
            for await (const [_stepIndex, _step] of Object.entries(steps)) {
                Assert.Condition(_step !== null, `Plan.ExecuteSteps '${$context.$plan!.name}', Entity '${$context.$plan!.entity}': error have been encountered in step ${$context.$plan!.$current.stepIndex}`, new HttpErrorBadRequest())

                Logger.Debug(`${Logger.In} Plan.ExecuteSteps '${$context.$plan!.name}', Entity '${$context.$plan!.entity}', step ${$context.$plan!.$current.stepIndex}: ${JsonUtils.Stringify(_step)}`)

                // $context = merge(
                //     $context,
                //     <Partial<TContext>>{
                //         $plan: {
                //             $current: {
                //                 stepIndex: parseInt(_stepIndex, 10) + 1,
                //                 stepCommand: keys(_step)[0],
                //                 stepArgs: values(<TStepArgs>_step)[0],
                //                 status: STEP_STATUS.RUNNING
                //             }
                //         }
                //     }
                // )

                $context.$plan!.$current = {
                    ...$context.$plan!.$current,
                    stepIndex: parseInt(_stepIndex, 10) + 1,
                    stepCommand: keys(_step)[0] as STEP,
                    stepArgs: values(<TStepArgs>_step)[0],
                    status: STEP_STATUS.RUNNING
                }

                // const __stepCommand: string = keys(_step)[0]
                // const __stepArgs: TStepArgs = values(<object>_step)[0]
                const __stepArguments: TStep = {
                    currentSchemaName: $context.$plan!.schema!,
                    currentPlanName: $context.$plan!.name!,
                    currentDataTable: this._dataBase.Tables[currentEntityName],
                    stepArgs: $context.$plan!.$current.stepArgs!
                }

                const executeStep = Step.ExecuteCaseMap[$context.$plan!.$current.stepCommand!] ?? Helper.CaseMapNotFound($context.$plan!.$current.stepCommand!)

                Assert.Var<TFunctionStep>(
                    executeStep,
                    `Plan.ExecuteSteps '${$context.$plan!.name}', Entity '${$context.$plan!.entity}': error have been encountered in step ${$context.$plan!.$current.stepIndex}`, new HttpErrorInternalServerError())

                const __stepReturn = await executeStep(__stepArguments)
                if (__stepReturn) {
                    this._dataBase.Tables[currentEntityName] = __stepReturn
                }

                $context = merge(
                    $context,
                    <Partial<TContext>>{
                        $plan: {
                            $current: {
                                status: STEP_STATUS.COMPLETED
                            }
                        }
                    }
                )
            }

        } catch (error: unknown) {
            const _error = error as Error

            switch (true) {
                case _error.message === "__BREAK__":
                    Logger.Info(`${Logger.Out} Plan.ExecuteSteps '${$context.$plan!.name}', Entity '${$context.$plan!.entity}': user break at step '${$context.$plan!.$current.stepIndex}', ${JsonUtils.Stringify($context.$plan!.$current.stepCommand)}`)
                    $context = merge(
                        $context,
                        <Partial<TContext>>{
                            $plan: {
                                $current: {
                                    status: STEP_STATUS.COMPLETED
                                }
                            }
                        }
                    )
                    break
                default:
                    // eslint-disable-next-line no-case-declarations
                    const _errorMessage = `Plan.ExecuteSteps '${$context.$plan!.name}', Entity '${$context.$plan!.entity}': step '${$context.$plan!.$current.stepIndex},${JsonUtils.Stringify($context.$plan!.$current.stepCommand)}' is ignored because of error ${JsonUtils.Stringify(_error?.message)}`

                    if (typia.is<WarnError>(error)) {
                        Logger.Warn(_errorMessage)
                    } else {
                        Logger.Error(_errorMessage)
                    }

                    if (this._dataBase.Tables[currentEntityName].MetaData[METADATA.PLAN_DEBUG] == 'error') {
                        /* TODO In case of cross entities, only errors in the final entity are returned.
                        Console log is working fine.
                        */
                        const _planErrors: TJson = {
                            [`entity(${$context.$plan!.entity}), step(${$context.$plan!.$current.stepIndex})`]: $context.$plan!.$current.stepCommand
                        }

                        Logger.Debug(`${Logger.Out} Plan.ExecuteSteps '${$context.$plan!.name}', Entity '${$context.$plan!.entity}': step '${$context.$plan!.$current.stepIndex},${JsonUtils.Stringify($context.$plan!.$current.stepArgs)}' added error ${JsonUtils.Stringify((<TJson[]>this._dataBase.Tables[currentEntityName].MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`)
                    }

                    $context = merge(
                        $context,
                        <Partial<TContext>>{
                            $plan: {
                                $current: {
                                    data: this._dataBase.Tables[currentEntityName],
                                    status: STEP_STATUS.FAILED
                                }
                            }
                        }
                    )

            }
        }

        // this.#__LOCK__.get($context.$plan!.entity)!.Release()

        return this._dataBase.Tables[currentEntityName].Rename($context.$plan!.entity)
    }

    @Logger.LogFunction()
    async Reload(plan: string, userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

        const configFileJson = await ConfigManager.Load()

        // check if plan exist
        if (ConfigManager.Has(`plans.${plan}`) && has(configFileJson.plans, plan)) {
            ConfigManager.Set(`plans.${plan}`, configFileJson.plans[plan])
            await this.Init()
            return HttpResponse.Ok({
                plan,
                message: `Plan reloaded`
            })
        }

        // plan not found
        throw new HttpErrorNotFound(`Plan '${plan}' not found`)
    }
}
