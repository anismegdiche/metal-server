//
//
//
//
//
import _ from "lodash"
import typia from "typia"
//
import { METADATA } from "../lib/Const"
import { Logger } from "../utils/Logger"
import { Config } from "./Config"
import { TInternalResponse } from "../types/TInternalResponse"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TScheduleConfig } from "./Schedule"
import { Step, TStepArguments } from "./Step"
import { DataTable, TRow } from "../types/DataTable"
import { Helper } from "../lib/Helper"
import { WarnError } from "./InternalError"
import { JsonHelper } from "../lib/JsonHelper"
import { HttpResponse } from "./HttpResponse"
import { HttpErrorNotFound } from "./HttpErrors"
import { StepCommand, TConfigSource } from '../types/TConfig'
import { PERMISSION, Roles } from "./Roles"
import { TUserTokenInfo } from "./User"
import { TContext } from "../@types/TContext"
import { MemoryData } from "../providers/data/MemoryData"
import { absDataProvider } from "../providers/absDataProvider"
import { DATA_PROVIDER } from "../providers/DataProvider"
import { Semaphore } from "../utils/Semaphore"
import { SynchronizerManager } from "../utils/SynchronizerManager"


//
export class Plan {

    Name: string                                    // Plan name
    Entities = new Map<string, StepCommand[]>()     // Plan entities and associated steps
    DataBase: absDataProvider                       // Plan entities rendered data
    SemaphoreSize: number
    #__LOCK__ =  new Map<string, Semaphore>()       // Plan Lock by entity

    constructor(name: string) {
        this.Name = name
        this.DataBase = new MemoryData()
        this.SemaphoreSize = 1                      // Force to have single thread of execution
        // this.#__LOCK__ = new Semaphore(this.SemaphoreSize)
    }

    async Init() {
        const entities = Config.Get<TJson<StepCommand[]>>(`plans.${this.Name}`) ??  {}

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

        const entitySteps: Array<StepCommand> = Config.Get(`plans.${plan}.${entity}`)

        Logger.Debug(`${Logger.In} Plan.Execute: ${plan}.${entity}: ${JsonHelper.Stringify(entitySteps)}`)
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

        Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}': semaphore = ${this.SemaphoreSize}, $context = ${JsonHelper.Stringify($context)}`)

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

            Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}', step ${$context.$plan!.currentStep}: ${JsonHelper.Stringify(step)}`)

            if (step === null) {
                Logger.Error(`Plan.ExecuteSteps '${currentPlanName}': error have been encountered in step ${$context.$plan!.currentStep}, ${JsonHelper.Stringify(step)}`)
                break
            }

            try {

                const __stepCommand: string = _.keys(<object>step)[0]

                const __stepParams: TJson = _.values(<object>step)[0]

                if (__stepCommand === 'break') {
                    Logger.Info(`Plan.ExecuteSteps '${currentPlanName}': user break at step '${$context.$plan!.currentStep}', ${JsonHelper.Stringify(step)}`)
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
                const _errorMessage = `Plan.ExecuteSteps '${currentPlanName}', Entity '${currentEntityName}': step '${$context.$plan!.currentStep},${JsonHelper.Stringify(step)}' is ignored because of error ${JsonHelper.Stringify(_error?.message)}`

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
                    Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}', Entity '${currentEntityName}': step '${$context.$plan!.currentStep},${JsonHelper.Stringify(step)}' added error ${JsonHelper.Stringify((<TJson[]>currentDataTable.MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`)
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
            Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}', step ${$context.$plan!.currentStep}: $context = ${JsonHelper.Stringify($context)}`)
        }

        this.#__LOCK__.get(currentEntityName)!.Release()

        return currentDataTable.Rename(currentEntityName)
    }

    @Logger.LogFunction()
    async Reload(plan: string, userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, PERMISSION.ADMIN)

        const configFileJson = await Config.Load()

        // check if plan exist
        if (Config.Has(`plans.${plan}`) && _.has(configFileJson.plans, plan)) {
            Config.Set(`plans.${plan}`, configFileJson.plans[plan])
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
