import * as Fs from "fs"
import * as Yaml from "js-yaml"
import _ from "lodash"
//
import { HTTP_STATUS_CODE, RESPONSE_RESULT, RESPONSE_STATUS } from "../lib/Const"
import { Logger } from "../lib/Logger"
import { Config } from "./Config"
import { TInternalResponse } from "../types/TInternalResponse"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../types/TSchemaResponse"
import { TypeHelper } from "../lib/TypeHelper"
import { TScheduleConfig } from "./Schedule"
import { Step } from "./Step"


export class Plan {
    static async Execute(schemaRequest: TSchemaRequest | TScheduleConfig, sqlQuery: string | undefined = undefined): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} Plan.Execute: ${JSON.stringify(schemaRequest)}`)

        // TSchemaRequest
        if (TypeHelper.IsSchemaRequest(schemaRequest)) {

            const { schemaName, sourceName, entityName } = schemaRequest

            const schemaResponseNoData = <TSchemaResponseNoData>{
                schemaName,
                entityName,
                ...RESPONSE_RESULT.NOT_FOUND,
                ...RESPONSE_STATUS.HTTP_404
            }

            const sourcePlanName: string = Config.Get(`sources.${sourceName}.database`)

            if (sourceName === undefined || sourcePlanName === undefined) {
                Logger.Error(`${Logger.Out} Plan.Execute: no plan found for ${schemaName}`)
                return schemaResponseNoData
            }

            if (!Config.Has(`plans.${sourcePlanName}.${entityName}`)) {
                Logger.Error(`${Logger.Out} Plan.Execute: entityName '${entityName}' not found in plan ${sourcePlanName}`)
                return schemaResponseNoData
            }

            const schemaResponse = <TSchemaResponse>{
                schemaName,
                entityName,
                transaction: "plan"
            }

            const entitySteps: TJson[] = Config.Get(`plans.${sourcePlanName}.${entityName}`)

            Logger.Debug(`${Logger.In} Plan.Execute: ${sourceName}.${entityName}: ${JSON.stringify(entitySteps)}`)

            const currentDatatable = await Step.Execute(schemaName, sourceName, entityName, entitySteps)

            await currentDatatable.FreeSql(sqlQuery)

            Logger.Debug(`${Logger.Out} Plan.Execute: ${sourceName}.${entityName}`)
            return <TSchemaResponseData>{
                ...schemaResponse,
                ...RESPONSE_RESULT.SUCCESS,
                ...RESPONSE_STATUS.HTTP_200,
                data: currentDatatable
            }
        }
        // TScheduleConfig
        const { planName, entityName } = schemaRequest

        const schemaResponseNoData = <TSchemaResponseNoData>{
            schemaName: planName,
            entityName,
            ...RESPONSE_RESULT.NOT_FOUND,
            ...RESPONSE_STATUS.HTTP_404
        }

        if (planName === undefined) {
            Logger.Error(`${Logger.Out} Plan.Execute: plan '${planName}' not found`)
            return schemaResponseNoData
        }

        if (!Config.Has(`plans.${planName}.${entityName}`)) {
            Logger.Error(`${Logger.Out} Plan.Execute: entityName '${entityName}' not found in plan ${planName}`)
            return schemaResponseNoData
        }

        const schemaResponse = <TSchemaResponse>{
            schemaName: planName,
            entityName,
            transaction: "plan"
        }

        const entitySteps: TJson[] = Config.Get(`plans.${planName}.${entityName}`)

        Logger.Debug(`${Logger.In} Plan.Execute: ${planName}.${entityName}: ${JSON.stringify(entitySteps)}`)

        const currentDatatable = await Step.Execute(undefined, planName, entityName, entitySteps)

        await currentDatatable.FreeSql(sqlQuery)

        Logger.Debug(`${Logger.Out} Plan.Execute: ${planName}.${entityName}`)
        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE_RESULT.SUCCESS,
            ...RESPONSE_STATUS.HTTP_200,
            data: currentDatatable
        }
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
