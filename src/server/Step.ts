//
//
//
//
// 
import _ from "lodash"
//
import { METADATA } from "../lib/Const"
import { Helper } from "../lib/Helper"
import { Logger } from "../lib/Logger"
import { DataTable, TOrder, TRow } from "../types/DataTable"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { SqlQueryHelper } from "../lib/SqlQueryHelper"
import { StringHelper } from "../lib/StringHelper"
import { AiEngine } from "./AiEngine"
import { Schema } from "./Schema"
import { CommonSqlDataProviderOptions } from '../providers/data/CommonSqlDataProvider'
import { TOptions } from "../types/TOptions"
import { TypeHelper } from "../lib/TypeHelper"
import { Plan } from "./Plan"
import { WarnError } from "./InternalError"
import { JsonHelper } from "../lib/JsonHelper"

export type TStepArguments = {
    currentSchemaName: string
    currentPlanName: string
    currentDataTable: DataTable
    stepParams?: TSchemaRequest | TJson | string
}


export class Step {

    static readonly Options = new CommonSqlDataProviderOptions()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static ExecuteCaseMap: Record<string, Function> = {
        debug: async (stepArguments: TStepArguments) => await Step.Debug(stepArguments),
        select: async (stepArguments: TStepArguments) => await Step.Select(stepArguments),
        update: async (stepArguments: TStepArguments) => await Step.Update(stepArguments),
        delete: async (stepArguments: TStepArguments) => await Step.Delete(stepArguments),
        insert: async (stepArguments: TStepArguments) => await Step.Insert(stepArguments),
        join: async (stepArguments: TStepArguments) => await Step.Join(stepArguments),
        fields: async (stepArguments: TStepArguments) => await Step.Fields(stepArguments),
        sort: async (stepArguments: TStepArguments) => await Step.Sort(stepArguments),
        run: async (stepArguments: TStepArguments) => await Step.Run(stepArguments),
        sync: async (stepArguments: TStepArguments) => await Step.Sync(stepArguments),
        anonymize: async (stepArguments: TStepArguments) => await Step.Anonymize(stepArguments)
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static JoinCaseMap: Record<string, Function> = {
        left: async (dtLeft: DataTable, dtRight: DataTable, leftFieldName: string, rightFieldName: string) => dtLeft.LeftJoin(dtRight, leftFieldName, rightFieldName),
        right: async (dtLeft: DataTable, dtRight: DataTable, leftFieldName: string, rightFieldName: string) => dtLeft.RightJoin(dtRight, leftFieldName, rightFieldName),
        inner: async (dtLeft: DataTable, dtRight: DataTable, leftFieldName: string, rightFieldName: string) => dtLeft.InnerJoin(dtRight, leftFieldName, rightFieldName),
        fullOuter: async (dtLeft: DataTable, dtRight: DataTable, leftFieldName: string, rightFieldName: string) => dtLeft.FullOuterJoin(dtRight, leftFieldName, rightFieldName),
        cross: async (dtLeft: DataTable, dtRight: DataTable) => dtLeft.CrossJoin(dtRight)
    }


    static async Select(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Select: ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Select: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new Error(`Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schemaName, entityName } = schemaRequest
        const { currentDataTable } = stepArguments

        if (entityName) {
            const _schemaResponse = await Schema.Select({
                ...schemaRequest,
                schemaName: schemaName ?? currentSchemaName
            })

            if (TypeHelper.IsSchemaResponseError(_schemaResponse)) {
                throw new Error(_schemaResponse.error)
            }

            if (TypeHelper.IsSchemaResponseData(_schemaResponse)) {
                return _schemaResponse.data
            }
        }

        // case no schema and no entity --> use current datatable
        //TODO: missing options.cache
        if (!schemaName && !entityName) {
            const options: TOptions = Step.Options.Parse(schemaRequest)
            const sqlQueryHelper = new SqlQueryHelper()
                .Select(options.Fields)
                .From(`\`${currentDataTable.Name}\``)
                .Where(options.Filter)

            const sqlQuery = (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined || options.Data != undefined)
                ? sqlQueryHelper.Query
                : undefined

            const sqlData = (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined || options.Data != undefined)
                ? sqlQueryHelper.Data
                : undefined

            return await currentDataTable.FreeSql(sqlQuery, sqlData)
        }

        return currentDataTable
    }

    static async Insert(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Insert: ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Insert: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new Error(`Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schemaName, entityName, data } = schemaRequest
        const { currentDataTable } = stepArguments

        if (!data && currentDataTable.Rows.length == 0) {
            throw new WarnError(`Step.Insert: No data to insert ${JsonHelper.Stringify(stepArguments.stepParams)}`)
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
            throw new WarnError(`Step.Insert: No data to insert ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        // case no schema and no entity --> use current datatable
        if (!schemaName && !entityName) {
            currentDataTable.AddRows(data)
        }

        return currentDataTable
    }

    static async Update(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Update: ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Update: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new Error(`Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schemaName, entityName, data } = schemaRequest
        const { currentDataTable } = stepArguments

        if (!data) {
            Logger.Error(`Step.Update: no data to update ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new Error(`No data to update ${JsonHelper.Stringify(stepArguments.stepParams)}`)
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
            const _sqlQueryHelper = new SqlQueryHelper()
                .Update(`\`${currentDataTable.Name}\``)
                .Set(_options.Data)
                .Where(_options.Filter)

            await currentDataTable.FreeSql(_sqlQueryHelper.Query, _sqlQueryHelper.Data)
        }

        return currentDataTable
    }

    static async Delete(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Delete: ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Delete: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new Error(`Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schemaName, entityName } = schemaRequest
        const { currentDataTable } = stepArguments

        if (entityName) {
            const _schemaResponse = await Schema.Delete({
                ...schemaRequest,
                schemaName: schemaName ?? currentSchemaName
            })

            if (TypeHelper.IsSchemaResponseError(_schemaResponse))
                throw new Error(_schemaResponse.error)

            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        if (!schemaName && !entityName) {
            const _options: TOptions = Step.Options.Parse(schemaRequest)
            const _sqlQueryHelper = new SqlQueryHelper()
                .Delete()
                .From(`\`${currentDataTable.Name}\``)
                .Where(_options.Filter)

            await currentDataTable.FreeSql(_sqlQueryHelper.Query, _sqlQueryHelper.Data)
        }

        return currentDataTable
    }

    static async Join(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Join: ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        const stepParams: Record<string, string> = stepArguments.stepParams as Record<string, string>
        const { currentPlanName, currentDataTable } = stepArguments

        if (stepParams === null)
            return currentDataTable

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
            ? await Step.Select(requestToSchema)
            : await Plan.Process(requestToCurrentPlan)

        return await this.JoinCaseMap[type](stepArguments.currentDataTable, dtRight, leftField, rightField) ??
            (Helper.CaseMapNotFound(type) && stepArguments.currentDataTable)
    }


    static async Fields(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Fields: ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        const stepParams: string = stepArguments.stepParams as string
        const fields = StringHelper.Split(stepParams, ",")
        return stepArguments.currentDataTable.SelectFields(fields)
    }

    static async Sort(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Sort: ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        const stepParams = stepArguments.stepParams as Record<string, TOrder>
        const { currentDataTable } = stepArguments

        const fields = _.keys(stepParams)
        const orders: TOrder[] = _.values(stepParams)

        return currentDataTable.Sort(fields, orders)
    }

    static async Debug(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Debug: ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        const debug = stepArguments.stepParams as string ?? 'error'
        stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_DEBUG, debug)

        if (stepArguments.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return stepArguments.currentDataTable
    }

    static async Run(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Run: ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        const { ai, input, output } = stepArguments.stepParams as {
            ai: string
            input: string
            output: TJson
        }

        const promises = []

        for await (const [_rowIndex, _rowData] of stepArguments.currentDataTable.Rows.entries()) {
            promises.push((async () => {
                const __result = <Record<string, any>>(await AiEngine.AiEngine[ai].Run(<string>_rowData[input]))
                if (!__result) {
                    return
                }
                // check if output is empty
                if (_.isNil(output) || _.isEmpty(output)) {
                    stepArguments.currentDataTable.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    stepArguments.currentDataTable.Rows[_rowIndex][ai] = JsonHelper.SafeCopy(__result)
                    return
                }

                // check if output is string
                if (_.isString(output)) {
                    stepArguments.currentDataTable.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    stepArguments.currentDataTable.Rows[_rowIndex][output] = __result
                    return
                }

                // else                
                for (const [___inField, ___outField] of Object.entries(output)) {
                    _rowData[___outField as string] = __result[___inField]
                }
                stepArguments.currentDataTable.Rows[_rowIndex] = _rowData
            })())
        }

        await Promise.all(promises)

        return stepArguments.currentDataTable.SetFields()
    }
    static async Sync(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Run: ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        const { source, destination, on } = stepArguments.stepParams as {
            source: {
                schemaName: string
                entityName: string
            }
            destination: {
                schemaName: string
                entityName: string
            }
            on: string
        }

        if (!on) {
            throw new Error('on is required')
        }

        if (!source && !destination) {
            throw new Error('source or/and destination is required')
        }

        const dtSource: DataTable = (source)
            ? (await Step.#_Select(source.schemaName, source.entityName)) ?? new DataTable(source.entityName)
            : stepArguments.currentDataTable

        const dtDestination: DataTable = (destination)
            ? (await Step.#_Select(destination.schemaName, destination.entityName)) ?? new DataTable(destination.entityName)
            : stepArguments.currentDataTable


        const syncReport = dtSource.SyncReport(dtDestination, on, {
            keepOnlyUpdatedValues: true
        })

        // Apply transformations
        // Delete
        _.map(syncReport.DeletedRows, on)
            .forEach((value: unknown) => Schema.Delete({
                schemaName: destination.schemaName,
                entityName: destination.entityName,
                filter: {
                    [on]: value
                }
            }))

        // Update
        syncReport.UpdatedRows.forEach((row: TRow) => Schema.Update({
            schemaName: destination.schemaName,
            entityName: destination.entityName,
            filter: {
                [on]: row[on]
            },
            data: [_.omit(row, on)]
        }))

        // Insert
        if (syncReport.AddedRows.length > 0) {
            Schema.Insert({
                schemaName: destination.schemaName,
                entityName: destination.entityName,
                data: syncReport.AddedRows
            })
        }

        // Fallback return
        if (!destination) {
            stepArguments.currentDataTable.Rows = [
                ...syncReport.DeletedRows,
                ...syncReport.UpdatedRows,
                ...syncReport.AddedRows
            ]
        }

        return stepArguments.currentDataTable.SetFields()
    }

    static async Anonymize(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Anonymize: ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        const stepParams: string = stepArguments.stepParams as string
        const fieldsToAnonymize = StringHelper.Split(stepParams, ",")
        return stepArguments.currentDataTable.AnonymizeFields(fieldsToAnonymize)
    }

    static async #_Select(schemaName: string, entityName: string): Promise<DataTable | undefined> {
        const _schemaResponse = await Schema.Select({
            schemaName,
            entityName
        })

        if (TypeHelper.IsSchemaResponseError(_schemaResponse)) {
            throw new Error(_schemaResponse.error)
        }

        if (TypeHelper.IsSchemaResponseData(_schemaResponse)) {
            return _schemaResponse.data
        }
        return undefined
    }
}
