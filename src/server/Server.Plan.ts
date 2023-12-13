/* eslint-disable no-continue */
import * as Fs from "fs"
import * as Yaml from "js-yaml"
import _ from "lodash"

import { HTTP_STATUS_CODE, RESPONSE_RESULT, RESPONSE_STATUS } from "../lib/Const"
import { Helper } from "../lib/Helper"
import { Logger } from "../lib/Logger"
import { Config } from "../server/Config"
import { DataTable, TFields, TOrder, TRows } from "../types/DataTable"
import { TInternalResponse } from "../types/TInternalResponse"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../types/TSchemaResponse"
import { SqlQueryHelper } from "../lib/Sql"
import { StringExtend } from "../lib/StringExtend"
import { AiEngine } from "../server/AiEngine"
import { Schema } from "../server/Schema"
import { TTransformation } from "../types/TTransformation"
import { Server } from "./Server"


type TStepArguments = {
    schemaName: string
    planName: string
    currentDataTable: DataTable
    transformation: TTransformation
}

const METADATA = {
    PLAN_DEBUG: '__PLAN_DEBUG__',
    PLAN_ERRORS: '__PLAN_ERRORS__'
}

class Step {
    static ExecuteCaseMap: Record<string, Function> = {
        'debug': async (stepArguments: TStepArguments) => await Step.#Debug(stepArguments),
        'select': async (stepArguments: TStepArguments) => await Step.#Select(stepArguments),
        'update': async (stepArguments: TStepArguments) => await Step.#Update(stepArguments),
        'delete': async (stepArguments: TStepArguments) => await Step.#Delete(stepArguments),
        'insert': async (stepArguments: TStepArguments) => await Step.#Insert(stepArguments),
        'join': async (stepArguments: TStepArguments) => await Step.#Join(stepArguments),
        'fields': async (stepArguments: TStepArguments) => await Step.#Fields(stepArguments),
        'sort': async (stepArguments: TStepArguments) => await Step.#Sort(stepArguments),
        'run': async (stepArguments: TStepArguments) => await Step.#Run(stepArguments),
        // TODO not tested
        'add-field': async (stepArguments: TStepArguments) => await Step.#AddField(stepArguments)
    }

    static JoinTypeCaseMap: Record<string, Function> = {
        'left': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.LeftJoin(dtRight, fieldNameLeft, fieldNameRight),
        'right': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.RightJoin(dtRight, fieldNameLeft, fieldNameRight),
        'inner': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.InnerJoin(dtRight, fieldNameLeft, fieldNameRight),
        'full_outer': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.FullOuterJoin(dtRight, fieldNameLeft, fieldNameRight),
        'cross': async (dtLeft: DataTable, dtRight: DataTable) => dtLeft.CrossJoin(dtRight)
    }

    static async #Select(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Select: ${JSON.stringify(stepArguments.transformation)}`)

        const schemaResponse: TSchemaResponse = await Schema.Select(<TSchemaRequest>stepArguments.transformation)

        stepArguments.currentDataTable.Fields = <TFields>{ ...(<TSchemaResponseData>schemaResponse).data.Fields }
        stepArguments.currentDataTable.Rows = <TRows>[...(<TSchemaResponseData>schemaResponse).data.Rows]

        return stepArguments.currentDataTable
    }

    static async #Insert(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Insert: ${JSON.stringify(stepArguments.transformation)}`)

        const { schema, entity, data } = stepArguments.transformation

        if (schema && !entity) {
            Logger.Warn(`Step.Insert: no entity was provided for schema ${schema}`)
            return stepArguments.currentDataTable
        }

        if (!data && !stepArguments.currentDataTable.Rows.length) {
            Logger.Warn(`Step.Insert: no data to insert`)
            return stepArguments.currentDataTable
        }

        if (schema) {
            let schemaRequest: TSchemaRequest = stepArguments.transformation
            schemaRequest = {
                ...schemaRequest,
                schema: schema ?? stepArguments.schemaName,
                data: (data)
                    ? data
                    : stepArguments.currentDataTable.Rows
            }
            await Schema.Insert(schemaRequest)
        } else {
            const dtToInsert = new DataTable(entity ?? stepArguments.currentDataTable.Name, stepArguments.transformation?.data)
            const sqlQuery = new SqlQueryHelper()
                .Insert(stepArguments.currentDataTable.Name)
                .Fields(dtToInsert.GetFieldsNames())
                .Values(dtToInsert.Rows)
                .Query

            stepArguments.currentDataTable.FreeSql(sqlQuery)
        }

        return stepArguments.currentDataTable
    }

    static async #Update(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Update: ${JSON.stringify(stepArguments.transformation)}`)

        const { schema, entity, data } = stepArguments.transformation

        if (!entity) {
            Logger.Warn(`Step.Insert: no entity was provided`)
            return stepArguments.currentDataTable
        }

        if (!data) {
            Logger.Warn(`Step.Insert: no data to insert`)
            return stepArguments.currentDataTable
        }

        if (schema) {
            await Schema.Update(stepArguments.transformation)

        } else {
            const _filter = stepArguments.transformation['filter-expression'] || [stepArguments.transformation?.filter] || undefined
            const _sqlQuery = new SqlQueryHelper()
                .Update(stepArguments.currentDataTable.Name)
                .Set(data)
                .Where(_filter)
                .Query

            stepArguments.currentDataTable.FreeSql(_sqlQuery)
        }
        return stepArguments.currentDataTable
    }

    static async #Delete(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Delete: ${JSON.stringify(stepArguments.transformation)}`)

        const { schema, entity } = stepArguments.transformation

        if (!entity) {
            Logger.Warn(`Step.Insert: no entity was provided`)
            return stepArguments.currentDataTable
        }

        if (schema) {
            await Schema.Delete(stepArguments.transformation)
        } else {
            const _filter = stepArguments.transformation['filter-expression'] || [stepArguments.transformation?.filter] || undefined
            const _sqlQuery = new SqlQueryHelper()
                .Delete()
                .From(stepArguments.currentDataTable.Name)
                .Where(_filter)
                .Query

            stepArguments.currentDataTable.FreeSql(_sqlQuery)
        }

        return stepArguments.currentDataTable
    }

    static async #Join(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Join: ${JSON.stringify(stepArguments.transformation)}`)

        const { schema, entity, type } = stepArguments.transformation
        const plan = Config.Configuration?.plans[stepArguments.planName]
        const fieldNameLeft = stepArguments.transformation["left-field"]
        const fieldNameRight = stepArguments.transformation["right-field"]

        let dtRight = new DataTable(entity)

        dtRight = (schema)
            ? await this.#Select(
                <TStepArguments>{
                    ...stepArguments,
                    currentDataTable: dtRight
                }
            )
            : await Server.Plan.Execute(stepArguments.schemaName, stepArguments.planName, entity, plan[entity])

        return await this.JoinTypeCaseMap[type](stepArguments.currentDataTable, dtRight, fieldNameLeft, fieldNameRight) ||
            (Helper.CaseMapNotFound(type) && stepArguments.currentDataTable)
    }


    static async #Fields(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Fields: ${JSON.stringify(stepArguments.transformation)}`)
        const _fields = StringExtend.Split(stepArguments.transformation, ",")
        return stepArguments.currentDataTable.SelectFields(_fields)
    }

    static async #Sort(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Sort: ${JSON.stringify(stepArguments.transformation)}`)

        const fields = Object.keys(stepArguments.transformation)
        const orders: TOrder[] = Object.values(stepArguments.transformation)

        return stepArguments.currentDataTable.Sort(fields, orders)
    }

    static async #Debug(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Debug: ${JSON.stringify(stepArguments.transformation)}`)
        const _debug: string = stepArguments.transformation || 'error'
        stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_DEBUG, _debug)

        if (stepArguments.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return stepArguments.currentDataTable
    }

    // TODO not tested
    static async #AddField(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.AddField: ${JSON.stringify(stepArguments.transformation)}`)
        const { name, type } = stepArguments.transformation
        stepArguments.currentDataTable.AddField(name, type)
        return stepArguments.currentDataTable
    }

    static async #Run(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Run: ${JSON.stringify(stepArguments.transformation)}`)

        const { ai, input, output } = stepArguments.transformation

        for await (const [_rowIndex, _rowData] of stepArguments.currentDataTable.Rows.entries()) {
            const __result = <Record<string, any>>(await AiEngine.Engine[ai].Run(<string>_rowData[input]))
            if (__result) {
                // check if output is empty
                if (_.isNil(output) || _.isEmpty(output)) {
                    stepArguments.currentDataTable.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    stepArguments.currentDataTable.Rows[_rowIndex][ai] = __result
                    continue
                }

                // check if output is string
                if (_.isString(output)) {
                    stepArguments.currentDataTable.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    stepArguments.currentDataTable.Rows[_rowIndex][output] = __result
                    continue
                }

                // else                
                for (const [___inField, ___outField] of Object.entries(output)) {
                    _rowData[___outField as string] = __result[___inField]
                }
                stepArguments.currentDataTable.Rows[_rowIndex] = _rowData
            }
        }
        return stepArguments.currentDataTable.SetFields()
    }

}


export class Server_Plan {
    static async Execute(schemaName: string | undefined, plan: string, entity: string, steps: TJson[]) {

        let dtWorking = new DataTable(entity)

        for await (const [stepIndex, step] of Object.entries(steps)) {
            const _stepIndex = parseInt(stepIndex, 10) + 1
            Logger.Debug(`Plan.Execute '${plan}': Step ${_stepIndex}, ${JSON.stringify(step)}`)

            try {

                const __stepCommand: string = Object.keys(step)[0]
                const __stepParameters: TJson = <TJson>step[__stepCommand]

                if (__stepCommand == 'break') {
                    Logger.Info(`Plan.Execute '${plan}': user break at step '${_stepIndex}', ${JSON.stringify(step)}`)
                    return dtWorking
                }

                const _stepArguments: TStepArguments = {
                    schemaName: schemaName as string,
                    planName: plan,
                    currentDataTable: dtWorking,
                    transformation: __stepParameters
                }

                dtWorking = await Step.ExecuteCaseMap[__stepCommand](_stepArguments) || Helper.CaseMapNotFound(__stepCommand)

            } catch (error: unknown) {
                const _error = <Error>error
                Logger.Error(`Plan.Execute '${plan}', Entity '${entity}': step '${_stepIndex},${JSON.stringify(step)}' is ignored because of error ${JSON.stringify(_error?.message)}`)
                if (dtWorking.MetaData[METADATA.PLAN_DEBUG] == 'error') {
                    /*
                    FIXME
                    In case of cross entities, only errors in the final entity are returned.
                    Console log is working fine.
                    */
                    const _planErrors: TJson = {}
                    _planErrors[`entity(${entity}), step(${stepIndex})`] = step
                    Logger.Debug(`Plan.Execute '${plan}', Entity '${entity}': step '${_stepIndex},${JSON.stringify(step)}' added error ${JSON.stringify((<TJson[]>dtWorking.MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`)
                }
            }
        }
        return dtWorking
    }

    static async GetData(schemaRequest: TSchemaRequest, sqlQuery: string | undefined = undefined) {

        const { schema, source, entity } = schemaRequest

        if (source === undefined || Config.Configuration.sources[source]?.database === undefined) {
            Logger.Error(`${Logger.Out} Plans.GetData: no plan found for ${schema}`)
            return <TSchemaResponseNoData>{
                schema,
                entity,
                ...RESPONSE_RESULT.NOT_FOUND,
                ...RESPONSE_STATUS.HTTP_404
            }
        }

        const planName = Config.Configuration.sources[source].database

        if (!Config.Configuration?.plans[planName]?.[entity]) {
            return <TSchemaResponseNoData>{
                schema,
                entity,
                ...RESPONSE_RESULT.NOT_FOUND,
                ...RESPONSE_STATUS.HTTP_404
            }
        }

        const schemaResponse = <TSchemaResponse>{
            schema,
            entity,
            transaction: "plan"
        }

        const planConfig = Config.Configuration?.plans[planName]
        const entitySteps = planConfig[entity]

        Logger.Debug(`${Logger.In} Plans.GetData: ${source}.${entity} : ${JSON.stringify(entitySteps)}`)

        const dtWorking = await this.Execute(schema, source, entity, entitySteps)

        if (sqlQuery !== undefined) {
            dtWorking.FreeSql(sqlQuery)
        }

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE_RESULT.SUCCESS,
            ...RESPONSE_STATUS.HTTP_200,
            data: dtWorking
        }
    }

    static Reload(plan: string): TInternalResponse {
        Logger.Debug(`${Logger.In} Plans.Reload`)
        const configFileRaw = Fs.readFileSync(Config.ConfigFilePath, 'utf-8')
        const configFileJson: any = Yaml.load(configFileRaw)
        // check if plan exist
        if (Config.Has(`plans.${plan}`) && _.has(configFileJson.plans, plan)) {
            Config.Configuration.plans[plan] = configFileJson.plans[plan]
            return <TInternalResponse>{
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: {
                    plan,
                    message: `Plan reloaded`
                }
            }
        }
        // plan not found
        return <TInternalResponse>{
            StatusCode: HTTP_STATUS_CODE.NOT_FOUND,
            Body: {
                plan,
                message: `Plan not found`
            }
        }
    }
}
