import _ from "lodash"
//
import { METADATA } from "../lib/Const"
import { Logger } from "../utils/Logger"
import { Config } from "./Config"
import { TInternalResponse } from "../types/TInternalResponse"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TypeHelper } from "../lib/TypeHelper"
import { TScheduleConfig } from "./Schedule"
import { Step, TStepArguments } from "./Step"
import { DataTable } from "../types/DataTable"
import { Helper } from "../lib/Helper"
import { WarnError } from "./InternalError"
import { JsonHelper } from "../lib/JsonHelper"
import { HttpResponse } from "./HttpResponse"
import { HttpErrorNotFound } from "./HttpErrors"
import {StepCommand} from '../types/TConfig'
import typia from "typia"


export class Plan {
    @Logger.LogFunction()
    static async Process(schemaRequest: TSchemaRequest | TScheduleConfig, sqlQuery: string | undefined = undefined): Promise<DataTable> {

        // TSchemaRequest
        if (TypeHelper.IsSchemaRequest(schemaRequest)) {
            const { schemaName, sourceName, entityName } = schemaRequest
            const sourcePlanName: string = Config.Get(`sources.${sourceName}.database`)

            if (sourceName === undefined || sourcePlanName === undefined) {
                Logger.Error(`${Logger.Out} Plan.Execute: no plan found for ${schemaName}`)
                return new DataTable(entityName)
            }

            if (!Config.Has(`plans.${sourcePlanName}.${entityName}`)) {
                Logger.Error(`${Logger.Out} Plan.Execute: entityName '${entityName}' not found in plan ${sourcePlanName}`)
                return new DataTable(entityName)
            }

            const entitySteps: Array<StepCommand> = Config.Get(`plans.${sourcePlanName}.${entityName}`)

            const currentDatatable = await Plan.ExecuteSteps(schemaName, sourceName, entityName, entitySteps)
            await currentDatatable.FreeSqlAsync(sqlQuery)

            Logger.Debug(`${Logger.Out} Plan.Execute: ${sourceName}.${entityName}`)
            return currentDatatable
        }

        // TScheduleConfig
        const { planName, entityName } = schemaRequest

        if (planName === undefined) {
            Logger.Error(`${Logger.Out} Plan.Execute: plan '${planName}' not found`)
            return new DataTable(entityName)
        }

        if (!Config.Has(`plans.${planName}.${entityName}`)) {
            Logger.Error(`${Logger.Out} Plan.Execute: entityName '${entityName}' not found in plan ${planName}`)
            return new DataTable(entityName)
        }

        const entitySteps: Array<StepCommand> = Config.Get(`plans.${planName}.${entityName}`)
       
        Logger.Debug(`${Logger.In} Plan.Execute: ${planName}.${entityName}: ${JsonHelper.Stringify(entitySteps)}`)
        const currentDatatable = await Plan.ExecuteSteps(undefined, planName, entityName, entitySteps)
        
        Logger.Debug(`${Logger.Out} Plan.Execute: ${planName}.${entityName}`)
        return await currentDatatable.FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction()
    static async ExecuteSteps(currentSchemaName: string | undefined, currentPlanName: string, currentEntityName: string, steps: Array<StepCommand>): Promise<DataTable> {

        let currentDataTable = new DataTable(currentEntityName)

        for await (const [stepIndex, step] of Object.entries(steps)) {
            const _stepIndex = parseInt(stepIndex, 10) + 1
            Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}': Step ${_stepIndex}, ${JsonHelper.Stringify(step)}`)

            if (step === null) {
                Logger.Error(`Plan.ExecuteSteps '${currentPlanName}': error have been encountered in step ${_stepIndex}, ${JsonHelper.Stringify(step)}`)
                break
            }

            try {
                // eslint-disable-next-line you-dont-need-lodash-underscore/keys
                const __stepCommand: string = _.keys(<object>step)[0]
                // eslint-disable-next-line you-dont-need-lodash-underscore/values
                const __stepParams: TJson = _.values(<object>step)[0]

                if (__stepCommand === 'break') {
                    Logger.Info(`Plan.ExecuteSteps '${currentPlanName}': user break at step '${_stepIndex}', ${JsonHelper.Stringify(step)}`)
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
                const _errorMessage = `Plan.ExecuteSteps '${currentPlanName}', Entity '${currentEntityName}': step '${_stepIndex},${JsonHelper.Stringify(step)}' is ignored because of error ${JsonHelper.Stringify(_error?.message)}`

                if (typia.is<WarnError>(error)) {
                    Logger.Warn(_errorMessage)
                } else {
                    Logger.Error(_errorMessage)
                }

                if (currentDataTable.MetaData[METADATA.PLAN_DEBUG] == 'error') {
                    /*
                    FIXME
                    In case of cross entities, only errors in the final entity are returned.
                    Console log is working fine.
                    */
                    const _planErrors: TJson = {}
                    _planErrors[`entity(${currentEntityName}), step(${stepIndex})`] = step
                    Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}', Entity '${currentEntityName}': step '${_stepIndex},${JsonHelper.Stringify(step)}' added error ${JsonHelper.Stringify((<TJson[]>currentDataTable.MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`)
                }
            }
        }
        return currentDataTable
    }

    @Logger.LogFunction()
    static async Reload(planName: string): Promise<TInternalResponse<TJson>> {
        const configFileJson = await Config.Load()

        // check if plan exist
        if (Config.Has(`plans.${planName}`) && _.has(configFileJson.plans, planName)) {
            Config.Set(`plans.${planName}`, configFileJson.plans[planName])
            return HttpResponse.Ok({
                plan: planName,
                message: `Plan reloaded`
            })
        }

        // plan not found
        throw new HttpErrorNotFound("Plan not found")
    }
}
