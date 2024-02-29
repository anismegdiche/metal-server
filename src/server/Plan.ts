import * as Fs from "fs"
import * as Yaml from "js-yaml"
import _ from "lodash"
//
import { HTTP_STATUS_CODE, METADATA } from "../lib/Const"
import { Logger } from "../lib/Logger"
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


export class Plan {
    static async Process(schemaRequest: TSchemaRequest | TScheduleConfig, sqlQuery: string | undefined = undefined): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Plan.Execute: ${JSON.stringify(schemaRequest)}`)

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

            const entitySteps: TJson[] = Config.Get(`plans.${sourcePlanName}.${entityName}`)
            Logger.Debug(`${Logger.In} Plan.Execute: ${sourceName}.${entityName}: ${JSON.stringify(entitySteps)}`)
            const currentDatatable = await Plan.ExecuteSteps(schemaName, sourceName, entityName, entitySteps)
            await currentDatatable.FreeSql(sqlQuery)

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

        const entitySteps: TJson[] = Config.Get(`plans.${planName}.${entityName}`)
        Logger.Debug(`${Logger.In} Plan.Execute: ${planName}.${entityName}: ${JSON.stringify(entitySteps)}`)
        const currentDatatable = await Plan.ExecuteSteps(undefined, planName, entityName, entitySteps)
        Logger.Debug(`${Logger.Out} Plan.Execute: ${planName}.${entityName}`)
        return await currentDatatable.FreeSql(sqlQuery)
    }

    static async ExecuteSteps(currentSchemaName: string | undefined, currentPlanName: string, currentEntityName: string, steps: TJson[]): Promise<DataTable> {

        let currentDataTable = new DataTable(currentEntityName)

        for await (const [stepIndex, step] of Object.entries(steps)) {
            const _stepIndex = parseInt(stepIndex, 10) + 1
            Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}': Step ${_stepIndex}, ${JSON.stringify(step)}`)

            if (step === null) {
                Logger.Error(`Plan.ExecuteSteps '${currentPlanName}': error have been encountered in step ${_stepIndex}, ${JSON.stringify(step)}`)
                break
            }

            try {
                // eslint-disable-next-line you-dont-need-lodash-underscore/keys
                const __stepCommand: string = _.keys(<object>step)[0]
                // eslint-disable-next-line you-dont-need-lodash-underscore/values
                const __stepParams: TJson = _.values(<object>step)[0]

                if (__stepCommand === 'break') {
                    Logger.Info(`Plan.ExecuteSteps '${currentPlanName}': user break at step '${_stepIndex}', ${JSON.stringify(step)}`)
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
                const _errorMessage = `Plan.ExecuteSteps '${currentPlanName}', Entity '${currentEntityName}': step '${_stepIndex},${JSON.stringify(step)}' is ignored because of error ${JSON.stringify(_error?.message)}`

                if (error instanceof WarnError) {
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
                    Logger.Debug(`Plan.ExecuteSteps '${currentPlanName}', Entity '${currentEntityName}': step '${_stepIndex},${JSON.stringify(step)}' added error ${JSON.stringify((<TJson[]>currentDataTable.MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`)
                }
            }
        }
        return currentDataTable
    }

    static Reload(planName: string): TInternalResponse {
        Logger.Debug(`${Logger.In} Plans.Reload`)
        const configFileRaw = Fs.readFileSync(Config.ConfigFilePath, 'utf8')
        const configFileJson: any = Yaml.load(configFileRaw)

        // check if plan exist
        if (Config.Has(`plans.${planName}`) && _.has(configFileJson.plans, planName)) {
            Config.Configuration.plans[planName] = configFileJson.plans[planName]
            return {
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: {
                    plan: planName,
                    message: `Plan reloaded`
                }
            }
        }

        // plan not found
        return {
            StatusCode: HTTP_STATUS_CODE.NOT_FOUND,
            Body: {
                plan: planName,
                message: `Plan not found`
            }
        }
    }
}
