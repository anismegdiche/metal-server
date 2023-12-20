/* eslint-disable no-continue */
import * as Fs from "fs"
import * as Yaml from "js-yaml"
import _ from "lodash"
//
import { HTTP_STATUS_CODE, METADATA, RESPONSE_RESULT, RESPONSE_STATUS } from "../lib/Const"
import { Helper } from "../lib/Helper"
import { Logger } from "../lib/Logger"
import { Config } from "./Config"
import { DataTable, TOrder } from "../types/DataTable"
import { TInternalResponse } from "../types/TInternalResponse"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../types/TSchemaResponse"
import { SqlQueryHelper } from "../lib/SqlQueryHelper"
import { StringExtend } from "../lib/StringExtend"
import { AiEngine } from "./AiEngine"
import { Schema } from "./Schema"
import { CommonSqlProviderOptions } from '../providers/CommonSqlProvider'
import { TOptions } from "../types/TOptions"


type TStepArguments = {
    schemaName: string
    planName: string
    currentDataTable: DataTable
    stepParams: any
}


class Step {

    static Options = CommonSqlProviderOptions

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

    static JoinCaseMap: Record<string, Function> = {
        'left': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.LeftJoin(dtRight, fieldNameLeft, fieldNameRight),
        'right': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.RightJoin(dtRight, fieldNameLeft, fieldNameRight),
        'inner': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.InnerJoin(dtRight, fieldNameLeft, fieldNameRight),
        'full_outer': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.FullOuterJoin(dtRight, fieldNameLeft, fieldNameRight),
        'cross': async (dtLeft: DataTable, dtRight: DataTable) => dtLeft.CrossJoin(dtRight)
    }

    static async Execute(schemaName: string | undefined, plan: string, entity: string, steps: TJson[]): Promise<DataTable> {

        let dtWorking = new DataTable(entity)

        for await (const [stepIndex, step] of Object.entries(steps)) {
            const _stepIndex = parseInt(stepIndex, 10) + 1
            Logger.Debug(`Step.Execute '${plan}': Step ${_stepIndex}, ${JSON.stringify(step)}`)

            try {
                const __stepCommand: string = Object.keys(step)[0]
                const __stepParameters: TJson = <TJson>step[__stepCommand]

                if (__stepCommand === 'break') {
                    Logger.Info(`Step.Execute '${plan}': user break at step '${_stepIndex}', ${JSON.stringify(step)}`)
                    return dtWorking
                }

                const _stepArguments: TStepArguments = {
                    schemaName: schemaName as string,
                    planName: plan,
                    currentDataTable: dtWorking,
                    stepParams: __stepParameters
                }

                dtWorking = await Step.ExecuteCaseMap[__stepCommand](_stepArguments) || Helper.CaseMapNotFound(__stepCommand)

            } catch (error: unknown) {
                const _error = <Error>error
                Logger.Error(`Step.Execute '${plan}', Entity '${entity}': step '${_stepIndex},${JSON.stringify(step)}' is ignored because of error ${JSON.stringify(_error?.message)}`)
                if (dtWorking.MetaData[METADATA.PLAN_DEBUG] == 'error') {
                    /*
                    FIXME
                    In case of cross entities, only errors in the final entity are returned.
                    Console log is working fine.
                    */
                    const _planErrors: TJson = {}
                    _planErrors[`entity(${entity}), step(${stepIndex})`] = step
                    Logger.Debug(`Step.Execute '${plan}', Entity '${entity}': step '${_stepIndex},${JSON.stringify(step)}' added error ${JSON.stringify((<TJson[]>dtWorking.MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`)
                }
            }
        }
        return dtWorking
    }

    static async #Select(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Select: ${JSON.stringify(stepArguments.stepParams)}`)
        // //
        const { schema, entity } = stepArguments.stepParams
        let { currentDataTable } = stepArguments

        if (!entity) {
            Logger.Warn(`Step.Select: no entity was provided`)
            return currentDataTable
        }

        if (schema) {
            const schemaResponse: TSchemaResponse = await Schema.Select(<TSchemaRequest>stepArguments.stepParams)

            if ('data' in schemaResponse && schemaResponse.data.Rows.length > 0) {
                currentDataTable = <DataTable>schemaResponse.data
            }

            return currentDataTable
        }

        const options: TOptions = Step.Options.Parse(stepArguments.stepParams)
        const sqlQuery = new SqlQueryHelper()
            .Select(options.Fields)
            .From(currentDataTable.Name)
            .Where(options.Filter)
            .Query

        return currentDataTable.FreeSql(sqlQuery)
    }

    static async #Insert(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Insert: ${JSON.stringify(stepArguments.stepParams)}`)

        const { schema, entity, data } = stepArguments.stepParams
        const { currentDataTable } = stepArguments

        if (schema && !entity) {
            Logger.Warn(`Step.Insert: no entity was provided for schema ${schema}`)
            return currentDataTable
        }

        if (!data && !currentDataTable.Rows.length) {
            Logger.Warn(`Step.Insert: no data to insert`)
            return currentDataTable
        }

        if (schema) {
            let schemaRequest: TSchemaRequest = stepArguments.stepParams
            schemaRequest = {
                ...schemaRequest,
                schema: schema ?? stepArguments.schemaName,
                data: (data)
                    ? data
                    : currentDataTable.Rows
            }
            await Schema.Insert(schemaRequest)
        } else {
            const dtToInsert = new DataTable(entity ?? currentDataTable.Name, data)
            const sqlQuery = new SqlQueryHelper()
                .Insert(dtToInsert.Name)
                .Fields(dtToInsert.GetFieldNames())
                .Values(dtToInsert.Rows)
                .Query

            currentDataTable.FreeSql(sqlQuery)
        }

        return currentDataTable
    }

    static async #Update(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Update: ${JSON.stringify(stepArguments.stepParams)}`)

        const { schema, entity, data } = stepArguments.stepParams
        const { currentDataTable } = stepArguments

        if (!entity) {
            Logger.Warn(`Step.Update: no entity was provided`)
            return currentDataTable
        }

        if (!data) {
            Logger.Warn(`Step.Update: no data to update`)
            return currentDataTable
        }

        if (schema) {
            await Schema.Update(stepArguments.stepParams)

        } else {
            const _options: TOptions = Step.Options.Parse(stepArguments.stepParams)
            const _sqlQuery = new SqlQueryHelper()
                .Update(currentDataTable.Name)
                .Set(_options.Data)
                .Where(_options.Filter)
                .Query

            currentDataTable.FreeSql(_sqlQuery)
        }
        return currentDataTable
    }

    static async #Delete(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Delete: ${JSON.stringify(stepArguments.stepParams)}`)

        const { schema, entity } = stepArguments.stepParams
        const { currentDataTable } = stepArguments

        if (!entity) {
            Logger.Warn(`Step.Delete: no entity was provided`)
            return currentDataTable
        }

        if (schema) {
            await Schema.Delete(stepArguments.stepParams)
        } else {
            const _options: TOptions = Step.Options.Parse(stepArguments.stepParams)
            const _sqlQuery = new SqlQueryHelper()
                .Delete()
                .From(currentDataTable.Name)
                .Where(_options.Filter)
                .Query

            currentDataTable.FreeSql(_sqlQuery)
        }

        return currentDataTable
    }

    static async #Join(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Join: ${JSON.stringify(stepArguments.stepParams)}`)

        const { schema, entity, type } = stepArguments.stepParams
        const fieldNameLeft = stepArguments.stepParams["left-field"]
        const fieldNameRight = stepArguments.stepParams["right-field"]


        let dtRight = new DataTable(entity)

        const requestToSchema: TStepArguments = {
            ...stepArguments,
            currentDataTable: dtRight
        }

        const requestToCurrentPlan: TSchemaRequest = {
            schema: stepArguments.schemaName,
            source: stepArguments.planName,
            entity
        }

        dtRight = (schema)
            ? await this.#Select(requestToSchema)
            // eslint-disable-next-line no-use-before-define
            : (await Plan.Execute(requestToCurrentPlan) as TSchemaResponseData).data

        return await this.JoinCaseMap[type](stepArguments.currentDataTable, dtRight, fieldNameLeft, fieldNameRight) ||
            (Helper.CaseMapNotFound(type) && stepArguments.currentDataTable)
    }


    static async #Fields(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Fields: ${JSON.stringify(stepArguments.stepParams)}`)
        const fields = StringExtend.Split(stepArguments.stepParams, ",")
        return stepArguments.currentDataTable.SelectFields(fields)
    }

    static async #Sort(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Sort: ${JSON.stringify(stepArguments.stepParams)}`)

        const fields = Object.keys(stepArguments.stepParams)
        const orders: TOrder[] = Object.values(stepArguments.stepParams)

        return stepArguments.currentDataTable.Sort(fields, orders)
    }

    static async #Debug(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Debug: ${JSON.stringify(stepArguments.stepParams)}`)
        const debug: string = stepArguments.stepParams || 'error'
        stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_DEBUG, debug)

        if (stepArguments.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return stepArguments.currentDataTable
    }

    // TODO not tested
    static async #AddField(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.AddField: ${JSON.stringify(stepArguments.stepParams)}`)
        const { name, type } = stepArguments.stepParams
        stepArguments.currentDataTable.AddField(name, type)
        return stepArguments.currentDataTable
    }

    static async #Run(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Run: ${JSON.stringify(stepArguments.stepParams)}`)

        const { ai, input, output } = stepArguments.stepParams

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


export class Plan {
    static async Execute(schemaRequest: TSchemaRequest, sqlQuery: string | undefined = undefined) {

        const { schema, source, entity } = schemaRequest

        const schemaResponseNoData = <TSchemaResponseNoData>{
            schema,
            entity,
            ...RESPONSE_RESULT.NOT_FOUND,
            ...RESPONSE_STATUS.HTTP_404
        }

        if (source === undefined || !Config.Has(`sources.${source}.database`)) {
            Logger.Error(`${Logger.Out} Plan.Execute: no plan found for ${schema}`)
            return schemaResponseNoData
        }

        const planName: string = Config.Get(`sources.${source}.database`)

        if (!Config.Has(`plans.${planName}.${entity}`)) {
            Logger.Error(`${Logger.Out} Plan.Execute: entity '${entity}' not found in plan ${planName}`)
            return schemaResponseNoData
        }

        const schemaResponse = <TSchemaResponse>{
            schema,
            entity,
            transaction: "plan"
        }

        const entitySteps: TJson[] = Config.Get(`plans.${planName}.${entity}`)

        Logger.Debug(`${Logger.In} Plan.Execute: ${source}.${entity}: ${JSON.stringify(entitySteps)}`)

        const dtWorking = await Step.Execute(schema, source, entity, entitySteps)

        if (sqlQuery !== undefined) {
            dtWorking.FreeSql(sqlQuery)
        }

        Logger.Debug(`${Logger.Out} Plan.Execute: ${source}.${entity}`)
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
            return {
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: {
                    plan,
                    message: `Plan reloaded`
                }
            }
        }

        // plan not found
        return {
            StatusCode: HTTP_STATUS_CODE.NOT_FOUND,
            Body: {
                plan,
                message: `Plan not found`
            }
        }
    }
}
