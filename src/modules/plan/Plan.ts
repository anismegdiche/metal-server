//
//
//
import _ from "lodash"
import typia from "typia"
//
import { METADATA } from "../core/@consts"
import { Logger } from "../../utils/Logger"
import { TInternalResponse } from "../schema/types/TInternalResponse"
import { TJson } from "../../types/TJson"
import { TSchemaRequest } from "../schema/types/TSchemaRequest"
import { TScheduleConfig } from './types/TScheduleConfig'
import { Step } from "./Step"
import { TStepArguments } from "./types/TStepArguments"
import { DataTable, TRow } from "../../types/DataTable"
import { Helper } from "../../utils/Helper"
import { WarnError } from "../errors/InternalError"
import { JsonUtils } from "../../utils/JsonUtils"
import { HttpResponse } from "../core/HttpResponse"
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { IDataProvider } from '../source/base/IDataProvider'
import { TConfigSource } from "../source/types/TConfigSource"
import { TContext } from "../sandbox/types/TContext"
import { MemoryData } from "../source/providers/MemoryData"
import { DATA_PROVIDER } from "../source/@consts"
import { Semaphore } from "../../utils/Semaphore"
import { SynchronizerManager } from "../../utils/SynchronizerManager"
import { AUTH_PERMISSION } from "../auth/@consts"
import { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { ConfigManager } from "../core/ConfigManager"
import { StepCommand } from "../core/types/TConfig"


//
export class Plan {

    Name: string                                    // Plan name
    Entities = new Map<string, StepCommand[]>()     // Plan entities and associated steps
    DataBase: IDataProvider                         // Plan entities rendered data
    SemaphoreSize: number
    #__LOCK__ = new Map<string, Semaphore>()       // Plan Lock by entity

    constructor(name: string) {
        this.Name = name
        this.DataBase = new MemoryData()
        this.SemaphoreSize = 1                      // Force to have single thread of execution
        // this.#__LOCK__ = new Semaphore(this.SemaphoreSize)
    }

    async Init() {
        const entities = ConfigManager.Get<TJson<StepCommand[]>>(`plans.${this.Name}`) ?? {}

        _.forEach(entities, (steps: StepCommand[], entity: string) => {
            this.Entities.set(entity, steps)
            this.#__LOCK__.set(entity, new Semaphore(this.SemaphoreSize))
        })

        this.DataBase = new MemoryData()

        await this.DataBase.Init(this.Name, <TConfigSource>{
            provider: DATA_PROVIDER.MEMORY,
            options: {
                autocreate: true
            }
        })
    }

    async ProcessSchemaRequest(schemaRequest: TSchemaRequest, sqlQuery?: string) {

        const { schema, source, entity } = schemaRequest
        // const sourcePlanName: string = Config.Get(`sources.${source}.database`)

        if (!source) {
            Logger.Error(`${Logger.Out} Plan.Execute: no plan found for ${schema}`)
            return new DataTable(entity)
        }

        if (!this.Entities.has(entity)) {
            Logger.Error(`${Logger.Out} Plan.Execute: entity '${entity}' not found in plan ${this.Name}`)
            return new DataTable(entity)
        }

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

    async ProcessScheduleConfig(schemaRequest: TScheduleConfig, sqlQuery?: string) {

        const { plan, entity } = schemaRequest

        if (plan === undefined) {
            Logger.Error(`${Logger.Out} Plan.Execute: plan '${plan}' not found`)
            return new DataTable(entity)
        }

        if (!this.Entities.has(entity)) {
            Logger.Error(`${Logger.Out} Plan.Execute: entity '${entity}' not found in plan ${this.Name}`)
            return new DataTable(entity)
        }

        const entitySteps: Array<StepCommand> = ConfigManager.Get(`plans.${plan}.${entity}`)

        Logger.Debug(`${Logger.In} Plan.Execute: ${plan}.${entity}: ${JsonUtils.Stringify(entitySteps)}`)
        const currentDatatable = await this.ExecuteSteps(undefined, plan, entity, entitySteps)

        Logger.Debug(`${Logger.Out} Plan.Execute: ${plan}.${entity}`)
        return await currentDatatable.FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized()
    async ExecuteSteps(currentSchemaName: string | undefined, currentPlanName: string, currentEntityName: string, steps: Array<StepCommand>): Promise<DataTable> {

        let currentDataTable = new DataTable(currentEntityName)

        let $context: Partial<TContext> = {}
        $context = {
            $plan: {
                name: currentPlanName,
                schema: currentSchemaName,
                entity: currentEntityName,
                currentData: <TRow[]>[]
            }
        }

        // Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}': semaphore = ${this.SemaphoreSize}, $context = ${JsonUtils.Stringify($context)}`)

        await this.#__LOCK__.get(currentEntityName)!.Acquire()

        for await (const [stepIndex, step] of Object.entries(steps)) {
            $context = _.merge(
                $context,
                {
                    $plan: {
                        step: parseInt(stepIndex, 10) + 1
                    }
                }
            )

            Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}', step ${$context.$plan!.currentStep}: ${JsonUtils.Stringify(step)}`)

            if (step === null) {
                Logger.Error(`Plan.ExecuteSteps '${currentPlanName}': error have been encountered in step ${$context.$plan!.currentStep}, ${JsonUtils.Stringify(step)}`)
                break
            }

            try {

                const __stepCommand: string = _.keys(<object>step)[0]

                const __stepParams: TJson = _.values(<object>step)[0]

                if (__stepCommand === 'break') {
                    Logger.Info(`Plan.ExecuteSteps '${currentPlanName}': user break at step '${$context.$plan!.currentStep}', ${JsonUtils.Stringify(step)}`)
                    return currentDataTable
                }

                const _stepArguments: TStepArguments = {
                    currentSchemaName: currentSchemaName as string,
                    currentPlanName,
                    currentDataTable,
                    stepParams: __stepParams
                }

                const executeStep = Step.ExecuteCaseMap[__stepCommand] ?? Helper.CaseMapNotFound(__stepCommand)
                if (executeStep !== undefined) {
                    currentDataTable = await executeStep(_stepArguments)
                }
            } catch (error: unknown) {
                const _error = error as Error
                const _errorMessage = `Plan.ExecuteSteps '${currentPlanName}', Entity '${currentEntityName}': step '${$context.$plan!.currentStep},${JsonUtils.Stringify(step)}' is ignored because of error ${JsonUtils.Stringify(_error?.message)}`

                if (typia.is<WarnError>(error)) {
                    Logger.Warn(_errorMessage)
                } else {
                    Logger.Error(_errorMessage)
                }

                if (currentDataTable.MetaData[METADATA.PLAN_DEBUG] == 'error') {
                    /* TODO In case of cross entities, only errors in the final entity are returned.
                    Console log is working fine.
                    */
                    const _planErrors: TJson = {}
                    _planErrors[`entity(${currentEntityName}), step(${stepIndex})`] = step
                    Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}', Entity '${currentEntityName}': step '${$context.$plan!.currentStep},${JsonUtils.Stringify(step)}' added error ${JsonUtils.Stringify((<TJson[]>currentDataTable.MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`)
                }
            }
            $context = _.merge(
                $context,
                {
                    $plan: {
                        data: currentDataTable.Rows
                    }
                }
            )
            // Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}', step ${$context.$plan!.currentStep}: $context = ${JsonUtils.Stringify($context)}`)
        }

        this.#__LOCK__.get(currentEntityName)!.Release()

        return currentDataTable.Rename(currentEntityName)
    }

    @Logger.LogFunction()
    async Reload(plan: string, userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

        const configFileJson = await ConfigManager.Load()

        // check if plan exist
        if (ConfigManager.Has(`plans.${plan}`) && _.has(configFileJson.plans, plan)) {
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
