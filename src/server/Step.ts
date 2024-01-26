/* eslint-disable no-continue */
import _ from "lodash"
import { METADATA } from "../lib/Const"
import { Helper } from "../lib/Helper"
import { Logger } from "../lib/Logger"
import { DataTable, TOrder } from "../types/DataTable"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TSchemaResponseData } from "../types/TSchemaResponse"
import { SqlQueryHelper } from "../lib/SqlQueryHelper"
import { StringHelper } from "../lib/StringHelper"
import { AiEngine } from "./AiEngine"
import { Schema } from "./Schema"
import { CommonSqlProviderOptions } from '../providers/CommonSqlProvider'
import { TOptions } from "../types/TOptions"
import { TypeHelper } from "../lib/TypeHelper"
import { Plan } from "./Plan"

export type TStepArguments = {
    currentSchemaName: string
    currentPlanName: string
    currentDataTable: DataTable
    stepParams?: TSchemaRequest | TJson | string
}


export class Step {

    static Options = new CommonSqlProviderOptions()

    static ExecuteCaseMap: Record<string, Function> = {
        debug: async (stepArguments: TStepArguments) => await Step._Debug(stepArguments),
        select: async (stepArguments: TStepArguments) => await Step._Select(stepArguments),
        update: async (stepArguments: TStepArguments) => await Step._Update(stepArguments),
        delete: async (stepArguments: TStepArguments) => await Step._Delete(stepArguments),
        insert: async (stepArguments: TStepArguments) => await Step._Insert(stepArguments),
        join: async (stepArguments: TStepArguments) => await Step._Join(stepArguments),
        fields: async (stepArguments: TStepArguments) => await Step._Fields(stepArguments),
        sort: async (stepArguments: TStepArguments) => await Step._Sort(stepArguments),
        run: async (stepArguments: TStepArguments) => await Step._Run(stepArguments),
        // TODO not tested
        addField: async (stepArguments: TStepArguments) => await Step._AddField(stepArguments)
    }

    static JoinCaseMap: Record<string, Function> = {
        left: async (dtLeft: DataTable, dtRight: DataTable, leftFieldName: string, rightFieldName: string) => dtLeft.LeftJoin(dtRight, leftFieldName, rightFieldName),
        right: async (dtLeft: DataTable, dtRight: DataTable, leftFieldName: string, rightFieldName: string) => dtLeft.RightJoin(dtRight, leftFieldName, rightFieldName),
        inner: async (dtLeft: DataTable, dtRight: DataTable, leftFieldName: string, rightFieldName: string) => dtLeft.InnerJoin(dtRight, leftFieldName, rightFieldName),
        fullOuter: async (dtLeft: DataTable, dtRight: DataTable, leftFieldName: string, rightFieldName: string) => dtLeft.FullOuterJoin(dtRight, leftFieldName, rightFieldName),
        cross: async (dtLeft: DataTable, dtRight: DataTable) => dtLeft.CrossJoin(dtRight)
    }

    static async Execute(currentSchemaName: string | undefined, currentPlanName: string, currentEntityName: string, steps: TJson[]): Promise<DataTable> {

        let currentDataTable = new DataTable(currentEntityName)

        for await (const [stepIndex, step] of Object.entries(steps)) {
            const _stepIndex = parseInt(stepIndex, 10) + 1
            Logger.Debug(`Step.Execute '${currentPlanName}': Step ${_stepIndex}, ${JSON.stringify(step)}`)

            if (step === null) {
                Logger.Error(`Step.Execute '${currentPlanName}': error have been encountered in step ${_stepIndex}, ${JSON.stringify(step)}`)
                break
            }

            try {
                // eslint-disable-next-line you-dont-need-lodash-underscore/keys
                const __stepCommand: string = _.keys(<object>step)[0]
                // eslint-disable-next-line you-dont-need-lodash-underscore/values
                const __stepParams: TJson = _.values(<object>step)[0]

                if (__stepCommand === 'break') {
                    Logger.Info(`Step.Execute '${currentPlanName}': user break at step '${_stepIndex}', ${JSON.stringify(step)}`)
                    return currentDataTable
                }

                const _stepArguments: TStepArguments = {
                    currentSchemaName: currentSchemaName as string,
                    currentPlanName,
                    currentDataTable,
                    stepParams: __stepParams
                }

                currentDataTable = await Step.ExecuteCaseMap[__stepCommand](_stepArguments) || Helper.CaseMapNotFound(__stepCommand)
                Logger.Debug(`***** ${JSON.stringify(currentDataTable)}`)
            } catch (error: unknown) {
                const _error = <Error>error
                Logger.Error(`Step.Execute '${currentPlanName}', Entity '${currentEntityName}': step '${_stepIndex},${JSON.stringify(step)}' is ignored because of error ${JSON.stringify(_error?.message)}`)
                if (currentDataTable.MetaData[METADATA.PLAN_DEBUG] == 'error') {
                    /*
                    FIXME
                    In case of cross entities, only errors in the final entity are returned.
                    Console log is working fine.
                    */
                    const _planErrors: TJson = {}
                    _planErrors[`entity(${currentEntityName}), step(${stepIndex})`] = step
                    Logger.Debug(`Step.Execute '${currentPlanName}', Entity '${currentEntityName}': step '${_stepIndex},${JSON.stringify(step)}' added error ${JSON.stringify((<TJson[]>currentDataTable.MetaData[METADATA.PLAN_ERRORS]).push(_planErrors))}`)
                }
            }
        }
        return currentDataTable
    }

    static async _Select(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Select: ${JSON.stringify(stepArguments.stepParams)}`)

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Select: Wrong argument passed ${JSON.stringify(stepArguments.stepParams)}`)
            throw new Error(`Wrong argument passed ${JSON.stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schemaName, entityName } = schemaRequest
        let { currentDataTable } = stepArguments

        if (entityName) {
            const _schemaResponse = await Schema.Select({
                ...schemaRequest,
                schemaName: schemaName ?? currentSchemaName
            })

            if (TypeHelper.IsSchemaResponseError(_schemaResponse)) {
                throw new Error(_schemaResponse.error)
            }

            if (TypeHelper.IsSchemaResponseData(_schemaResponse)) {
                currentDataTable = _schemaResponse.data
            }
            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        if (!schemaName && !entityName) {
            const options: TOptions = Step.Options.Parse(schemaRequest)
            const sqlQuery = new SqlQueryHelper()
                .Select(options.Fields)
                .From(currentDataTable.Name)
                .Where(options.Filter)
                .Query

            return await currentDataTable.FreeSql(sqlQuery)
        }

        return currentDataTable
    }

    static async _Insert(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Insert: ${JSON.stringify(stepArguments.stepParams)}`)

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Insert: Wrong argument passed ${JSON.stringify(stepArguments.stepParams)}`)
            throw new Error(`Wrong argument passed ${JSON.stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schemaName, entityName, data } = schemaRequest
        let { currentDataTable } = stepArguments

        if (!data && currentDataTable.Rows.length == 0) {
            Logger.Error(`Step.Insert: no data to insert ${JSON.stringify(stepArguments.stepParams)}`)
            throw new Error(`No data to insert ${JSON.stringify(stepArguments.stepParams)}`)
        }

        if (entityName) {
            const _schemaResponse = await Schema.Insert({
                ...schemaRequest,
                schemaName: schemaName ?? currentSchemaName,
                data: data ?? currentDataTable.Rows
            })

            if (TypeHelper.IsSchemaResponseError(_schemaResponse)) {
                throw new Error(_schemaResponse.error)
            }
            return currentDataTable
        }

        if (!data) {
            Logger.Error(`Step.Insert: no data to insert ${JSON.stringify(stepArguments.stepParams)}`)
            throw new Error(`No data to insert ${JSON.stringify(stepArguments.stepParams)}`)
        }

        // case no schema and no entity --> use current datatable
        if (!schemaName && !entityName) {
            currentDataTable.AddRows(data)
        }

        return currentDataTable
    }

    static async _Update(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Update: ${JSON.stringify(stepArguments.stepParams)}`)

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Update: Wrong argument passed ${JSON.stringify(stepArguments.stepParams)}`)
            throw new Error(`Wrong argument passed ${JSON.stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schemaName, entityName, data } = schemaRequest
        let { currentDataTable } = stepArguments

        if (!data) {
            Logger.Error(`Step.Update: no data to update ${JSON.stringify(stepArguments.stepParams)}`)
            throw new Error(`No data to update ${JSON.stringify(stepArguments.stepParams)}`)
        }

        if (entityName) {
            const _schemaResponse = await Schema.Update({
                ...schemaRequest,
                schemaName: schemaName ?? currentSchemaName
            })

            if (TypeHelper.IsSchemaResponseError(_schemaResponse)) {
                throw new Error(_schemaResponse.error)
            }
            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        if (!schemaName && !entityName) {
            const _options: TOptions = Step.Options.Parse(schemaRequest)
            const _sqlQuery = new SqlQueryHelper()
                .Update(currentDataTable.Name)
                .Set(_options.Data)
                .Where(_options.Filter)
                .Query

            await currentDataTable.FreeSql(_sqlQuery)
        }

        return currentDataTable
    }

    static async _Delete(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Delete: ${JSON.stringify(stepArguments.stepParams)}`)

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Delete: Wrong argument passed ${JSON.stringify(stepArguments.stepParams)}`)
            throw new Error(`Wrong argument passed ${JSON.stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schemaName, entityName } = schemaRequest
        let { currentDataTable } = stepArguments

        if (entityName) {
            const _schemaResponse = await Schema.Delete({
                ...schemaRequest,
                schemaName: schemaName ?? currentSchemaName
            })

            if (TypeHelper.IsSchemaResponseError(_schemaResponse)) {
                throw new Error(_schemaResponse.error)
            }
            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        if (!schemaName && !entityName) {
            const _options: TOptions = Step.Options.Parse(schemaRequest)
            const _sqlQuery = new SqlQueryHelper()
                .Delete()
                .From(currentDataTable.Name)
                .Where(_options.Filter)
                .Query

            await currentDataTable.FreeSql(_sqlQuery)
        }

        return currentDataTable
    }

    static async _Join(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Join: ${JSON.stringify(stepArguments.stepParams)}`)

        const stepParams: Record<string, string> = stepArguments.stepParams as Record<string, string>
        const { currentPlanName, currentDataTable } = stepArguments

        if (stepParams === null) {
            return currentDataTable
        }

        const { schemaName, entityName, type, leftField, rightField } = stepParams

        let dtRight = new DataTable(entityName)

        const requestToSchema: TStepArguments = {
            ...stepArguments,
            currentDataTable: dtRight,
            stepParams: {
                schemaName,
                entityName
            }
        }

        const requestToCurrentPlan: TSchemaRequest = {
            schemaName,
            sourceName: currentPlanName,
            entityName
        }

        dtRight = (schemaName)
            ? await Step._Select(requestToSchema)
            // eslint-disable-next-line no-use-before-define
            : (await Plan.Execute(requestToCurrentPlan) as TSchemaResponseData).data

        return await this.JoinCaseMap[type](stepArguments.currentDataTable, dtRight, leftField, rightField) ||
            (Helper.CaseMapNotFound(type) && stepArguments.currentDataTable)
    }


    static async _Fields(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Fields: ${JSON.stringify(stepArguments.stepParams)}`)
        const stepParams: string = stepArguments.stepParams as string
        const fields = StringHelper.Split(stepParams, ",")
        return stepArguments.currentDataTable.SelectFields(fields)
    }

    static async _Sort(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Sort: ${JSON.stringify(stepArguments.stepParams)}`)

        const stepParams = stepArguments.stepParams as Record<string, TOrder>
        const currentDataTable = stepArguments.currentDataTable

        // eslint-disable-next-line you-dont-need-lodash-underscore/keys
        const fields = _.keys(stepParams)
        // eslint-disable-next-line you-dont-need-lodash-underscore/values
        const orders: TOrder[] = _.values(stepParams)

        return currentDataTable.Sort(fields, orders)
    }

    static async _Debug(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Debug: ${JSON.stringify(stepArguments.stepParams)}`)
        const debug = stepArguments.stepParams as string || 'error'
        stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_DEBUG, debug)

        if (stepArguments.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return stepArguments.currentDataTable
    }

    // TODO not tested
    static async _AddField(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.AddField: ${JSON.stringify(stepArguments.stepParams)}`)
        const { name, type } = stepArguments.stepParams as {
            name: string
            type: string
        }
        await stepArguments.currentDataTable.AddField(name, type)
        return stepArguments.currentDataTable
    }

    static async _Run(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Run: ${JSON.stringify(stepArguments.stepParams)}`)

        const { ai, input, output } = stepArguments.stepParams as {
            ai: string
            input: string
            output: TJson
        }

        for await (const [_rowIndex, _rowData] of stepArguments.currentDataTable.Rows.entries()) {
            const __result = <Record<string, any>>(await AiEngine.AiEngine[ai].Run(<string>_rowData[input]))
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
