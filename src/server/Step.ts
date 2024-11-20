//
//
//
//
// 
import _ from "lodash"
//
import { METADATA } from "../lib/Const"
import { Helper } from "../lib/Helper"
import { Logger } from "../utils/Logger"
import { DataTable, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, TSortOrder, TRow, JOIN_TYPE } from "../types/DataTable"
import { TJson } from "../types/TJson"
import { TSchemaRequest, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect } from "../types/TSchemaRequest"
import { SqlQueryHelper } from "../lib/SqlQueryHelper"
import { StringHelper } from "../lib/StringHelper"
import { AiEngine } from "./AiEngine"
import { Schema } from "./Schema"
import { CommonSqlDataOptions } from "../providers/data/CommonSqlData"
import { TOptions } from "../types/TOptions"
import { TypeHelper } from "../lib/TypeHelper"
import { Plan } from "./Plan"
import { WarnError } from "./InternalError"
import { JsonHelper } from "../lib/JsonHelper"
import { TStepSync, TStepRemoveDuplicates, TStepSort, TStepRun, TStepSelect, TStepListEntities, TStepInsert } from "../types/TStep"
import { HttpErrorInternalServerError } from "./HttpErrors"
import { Config } from "./Config"


export enum STEP {
    DEBUG = "debug",
    SELECT = "select",
    UPDATE = "update",
    DELETE = "delete",
    INSERT = "insert",
    JOIN = "join",
    FIELDS = "fields",
    SORT = "sort",
    RUN = "run",
    SYNC = "sync",                           // v0.2
    ANONYMIZE = "anonymize",                 // v0.3        
    REMOVE_DUPLICATE = "remove-duplicates",  // v0.3
    LIST_ENTITIES = "list-entities"          // v0.3
}

export type TStepArguments = {
    currentSchemaName: string
    currentPlanName: string
    currentDataTable: DataTable
    stepParams?: TSchemaRequest | TJson | string
}

export class Step {

    static readonly Options = new CommonSqlDataOptions()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static ExecuteCaseMap: Record<string, Function> = {
        [STEP.DEBUG]: async (stepArguments: TStepArguments) => await Step.Debug(stepArguments),
        [STEP.SELECT]: async (stepArguments: TStepArguments) => await Step.Select(stepArguments),
        [STEP.UPDATE]: async (stepArguments: TStepArguments) => await Step.Update(stepArguments),
        [STEP.DELETE]: async (stepArguments: TStepArguments) => await Step.Delete(stepArguments),
        [STEP.INSERT]: async (stepArguments: TStepArguments) => await Step.Insert(stepArguments),
        [STEP.JOIN]: async (stepArguments: TStepArguments) => await Step.Join(stepArguments),
        [STEP.FIELDS]: async (stepArguments: TStepArguments) => await Step.Fields(stepArguments),
        [STEP.SORT]: async (stepArguments: TStepArguments) => await Step.Sort(stepArguments),
        [STEP.RUN]: async (stepArguments: TStepArguments) => await Step.Run(stepArguments),
        [STEP.SYNC]: async (stepArguments: TStepArguments) => await Step.Sync(stepArguments),
        [STEP.ANONYMIZE]: async (stepArguments: TStepArguments) => await Step.Anonymize(stepArguments),
        [STEP.REMOVE_DUPLICATE]: async (stepArguments: TStepArguments) => await Step.RemoveDuplicates(stepArguments),
        [STEP.LIST_ENTITIES]: async (stepArguments: TStepArguments) => await Step.ListEntities(stepArguments)
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static JoinCaseMap: Record<string, Function> = {
        [JOIN_TYPE.LEFT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.LeftJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.RIGHT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.RightJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.INNER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.InnerJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.FULL_OUTER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.FullOuterJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.CROSS]: async (dtLeft: DataTable, dtRight: DataTable) => dtLeft.CrossJoin(dtRight)
    }

    @Logger.LogFunction()
    static async Select(stepArguments: TStepArguments): Promise<DataTable> {

        const { currentSchemaName, currentDataTable } = stepArguments
        const schemaRequest = stepArguments.stepParams as TStepSelect
        const { schema, entity } = schemaRequest

        // TODO: recheck logic for schema=null
        if (entity) {
            const _internalResponse = await Schema.Select(<TSchemaRequestSelect>{
                ...schemaRequest,
                schema: schema ?? currentSchemaName
            })

            if (_internalResponse.Body && TypeHelper.IsSchemaResponseData(_internalResponse.Body))
                return _internalResponse.Body.data
        }

        // case no schema and no entity --> use current datatable
        //TODO: missing options.cache
        if (!schema && !entity) {
            const options: TOptions = Step.Options.Parse(<TSchemaRequestSelect>schemaRequest)
            const sqlQueryHelper = new SqlQueryHelper()
                .Select(options.Fields)
                .From(`\`${currentDataTable.Name}\``)
                .Where(options.Filter)

            const sqlQuery = (options.Fields != "*" || options.Filter != undefined || options.Sort != undefined || options.Data != undefined)
                ? sqlQueryHelper.Query
                : undefined

            const sqlData = (options.Fields != "*" || options.Filter != undefined || options.Sort != undefined || options.Data != undefined)
                ? sqlQueryHelper.Data
                : undefined

            return await currentDataTable.FreeSqlAsync(sqlQuery, sqlData)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Insert(stepArguments: TStepArguments): Promise<DataTable> {

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Insert: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new HttpErrorInternalServerError(`Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName, currentDataTable } = stepArguments
        const schemaRequest = stepArguments.stepParams as TStepInsert
        const { schema, entity, data } = schemaRequest

        if (!data && currentDataTable.Rows.length == 0) {
            throw new WarnError(`Step.Insert: No data to insert ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        // TODO: recheck logic for schema=null
        if (entity) {
            const _schemaResponse = await Schema.Insert(<TSchemaRequestInsert>{
                ...schemaRequest,
                schema: schema ?? currentSchemaName,
                data: data ?? currentDataTable.Rows
            })

            return currentDataTable
        }

        if (!data) {
            throw new WarnError(`Step.Insert: No data to insert ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        // case no schema and no entity --> use current datatable
        if (!schema && !entity) {
            currentDataTable.AddRows(data)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Update(stepArguments: TStepArguments): Promise<DataTable> {

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Update: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new HttpErrorInternalServerError(`Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName, currentDataTable } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schema, entity, data } = schemaRequest

        if (!data) {
            Logger.Error(`Step.Update: no data to update ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new HttpErrorInternalServerError(`No data to update ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        // TODO: recheck logic for schema=null
        if (entity) {
            const _schemaResponse = await Schema.Update({
                ...schemaRequest,
                schema: schema ?? currentSchemaName
            })

            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        if (!schema && !entity) {
            const _options: TOptions = Step.Options.Parse(schemaRequest)
            const _sqlQueryHelper = new SqlQueryHelper()
                .Update(`\`${currentDataTable.Name}\``)
                .Set(_options.Data)
                .Where(_options.Filter)

            await currentDataTable.FreeSqlAsync(_sqlQueryHelper.Query, _sqlQueryHelper.Data)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Delete(stepArguments: TStepArguments): Promise<DataTable> {

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams)) {
            Logger.Error(`${Logger.Out} Step.Delete: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new HttpErrorInternalServerError(`Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        const { currentSchemaName, currentDataTable } = stepArguments
        const schemaRequest = stepArguments.stepParams
        const { schema, entity } = schemaRequest

        // TODO: recheck logic for schema=null
        if (entity) {
            const _schemaResponse = await Schema.Delete({
                ...schemaRequest,
                schema: schema ?? currentSchemaName
            })

            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        if (!schema && !entity) {
            const _options: TOptions = Step.Options.Parse(schemaRequest)
            const _sqlQueryHelper = new SqlQueryHelper()
                .Delete()
                .From(`\`${currentDataTable.Name}\``)
                .Where(_options.Filter)

            await currentDataTable.FreeSqlAsync(_sqlQueryHelper.Query, _sqlQueryHelper.Data)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Join(stepArguments: TStepArguments): Promise<DataTable> {

        const stepParams: Record<string, string> = stepArguments.stepParams as Record<string, string>
        const { currentPlanName, currentDataTable } = stepArguments

        if (stepParams === null)
            return currentDataTable

        const { schema, entity, type, leftField, rightField } = stepParams

        let dtRight = new DataTable(entity)

        const requestToSchema: TStepArguments = {
            ...stepArguments,
            currentDataTable: dtRight,
            stepParams: {
                schema,
                entity
            }
        }

        const requestToCurrentPlan: TSchemaRequest = {
            schema,
            source: currentPlanName,
            entity
        }

        dtRight = (schema)
            ? await Step.Select(requestToSchema)
            : await Plan.Process(requestToCurrentPlan)

        return await this.JoinCaseMap[type](stepArguments.currentDataTable, dtRight, leftField, rightField) ??
            (Helper.CaseMapNotFound(type) && stepArguments.currentDataTable)
    }


    @Logger.LogFunction()
    static async Fields(stepArguments: TStepArguments): Promise<DataTable> {
        const stepParams: string = stepArguments.stepParams as string
        const fields = StringHelper.Split(stepParams, ",")
        return stepArguments.currentDataTable.SelectFields(fields)
    }

    @Logger.LogFunction()
    static async Sort(stepArguments: TStepArguments): Promise<DataTable> {

        const stepParams = stepArguments.stepParams as TStepSort
        const { currentDataTable } = stepArguments

        // eslint-disable-next-line you-dont-need-lodash-underscore/keys
        const fields = _.keys(stepParams)
        // eslint-disable-next-line you-dont-need-lodash-underscore/values
        const orders: TSortOrder[] = _.values(stepParams)

        return currentDataTable.Sort(fields, orders)
    }

    @Logger.LogFunction()
    static async Debug(stepArguments: TStepArguments): Promise<DataTable> {
        const debug = stepArguments.stepParams as string ?? "error"
        stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_DEBUG, debug)

        if (stepArguments.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return stepArguments.currentDataTable
    }

    @Logger.LogFunction()
    static async Run(stepArguments: TStepArguments): Promise<DataTable> {

        const { ai, input, output } = stepArguments.stepParams as TStepRun
        const promises = []

        for await (const [_rowIndex, _rowData] of stepArguments.currentDataTable.Rows.entries()) {
            promises.push((async () => {
                const __result = <Record<string, any>>(await AiEngine.AiEngine[ai].Run(<string>_rowData[input]))
                if (!__result) {
                    return
                }
                // check if output is empty
                // eslint-disable-next-line you-dont-need-lodash-underscore/is-nil
                if (_.isNil(output) || _.isEmpty(output)) {
                    stepArguments.currentDataTable.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    stepArguments.currentDataTable.Rows[_rowIndex][ai] = JsonHelper.SafeCopy(__result)
                    return
                }

                // check if output is string
                // eslint-disable-next-line you-dont-need-lodash-underscore/is-string
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

    @Logger.LogFunction()
    static async Sync(stepArguments: TStepArguments): Promise<DataTable> {

        const {
            source, destination, on,
            from, to, id
        } = stepArguments.stepParams as TStepSync

        const _from = source ?? from
        const _to = destination ?? to
        const _id = on ?? id

        if (!_id) {
            throw new HttpErrorInternalServerError("'on' or 'id' must be provided")
        }

        if (!_from && !_to) {
            throw new HttpErrorInternalServerError("Either 'source' or 'from', and 'destination' or 'to' must be provided")
        }

        const dtSource: DataTable = (_from)
            ? (await Step.#_Select(_from.schema, _from.entity)) ?? new DataTable(_from.entity)
            : stepArguments.currentDataTable

        const dtDestination: DataTable = (_to)
            ? (await Step.#_Select(_to.schema, _to.entity)) ?? new DataTable(_to.entity)
            : stepArguments.currentDataTable


        const syncReport = dtSource.SyncReport(dtDestination, _id, {
            keepOnlyUpdatedValues: true
        })

        // Apply transformations
        //// Delete
        // eslint-disable-next-line you-dont-need-lodash-underscore/map
        _.map(syncReport.DeletedRows, _id)
            .forEach((value: unknown) => Schema.Delete({
                schema: _to.schema,
                entity: _to.entity,
                filter: {
                    [_id]: value
                }
            }))

        //// Update
        syncReport.UpdatedRows.forEach((row: TRow) => Schema.Update({
            schema: _to.schema,
            entity: _to.entity,
            filter: {
                [_id]: row[_id]
            },
            // eslint-disable-next-line you-dont-need-lodash-underscore/omit
            data: [_.omit(row, _id)]
        }))

        //// Insert
        if (syncReport.AddedRows.length > 0) {
            Schema.Insert({
                schema: _to.schema,
                entity: _to.entity,
                data: syncReport.AddedRows
            })
        }

        // if no destination
        if (!_to) {
            stepArguments.currentDataTable.Rows = [
                ...syncReport.DeletedRows,
                ...syncReport.UpdatedRows,
                ...syncReport.AddedRows
            ]
        }

        return stepArguments.currentDataTable.SetFields()
    }

    @Logger.LogFunction()
    static async Anonymize(stepArguments: TStepArguments): Promise<DataTable> {
        const stepParams: string = stepArguments.stepParams as string
        const fieldsToAnonymize = StringHelper.Split(stepParams, ",")
        return stepArguments.currentDataTable.AnonymizeFields(fieldsToAnonymize)
    }

    @Logger.LogFunction()
    static async RemoveDuplicates(stepArguments: TStepArguments): Promise<DataTable> {

        const {
            keys = undefined,
            condition = undefined,
            method = REMOVE_DUPLICATES_METHOD.HASH,
            strategy = REMOVE_DUPLICATES_STRATEGY.FIRST
        } = stepArguments.stepParams as TStepRemoveDuplicates

        const { currentDataTable } = stepArguments

        currentDataTable.RemoveDuplicates(keys, method, strategy, condition)

        Logger.Debug(`${Logger.Out} Step.RemoveDuplicates: ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        return currentDataTable
    }

    @Logger.LogFunction()
    static async ListEntities(stepArguments: TStepArguments): Promise<DataTable> {

        const { currentDataTable, currentPlanName } = stepArguments
        const schemaRequest = stepArguments.stepParams as TStepListEntities

        // schema is defined
        if (schemaRequest?.schema) {
            const _internalResponse = await Schema.ListEntities(<TSchemaRequestListEntities>schemaRequest)

            if (_internalResponse.Body && TypeHelper.IsSchemaResponseData(_internalResponse.Body)) {
                Logger.Debug(`${Logger.Out} Step.ListEntities: ${JsonHelper.Stringify(stepArguments.stepParams)}`)
                return _internalResponse.Body.data
            }
        }

        // no schema passed, return list of plan entities
        // eslint-disable-next-line you-dont-need-lodash-underscore/keys
        const entitiesList = _.keys(Config.Get(`plans.${currentPlanName}`)).map(entity => ({
            name: entity,
            type: 'plan entity'
        }))
        Logger.Debug(`${Logger.Out} Step.ListEntities: ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        return new DataTable(currentDataTable.Name, entitiesList)
    }

    static async #_Select(schema: string, entity: string): Promise<DataTable | undefined> {
        const internalResponse = await Schema.Select({
            schema,
            entity
        })

        if (internalResponse.Body && TypeHelper.IsSchemaResponseData(internalResponse.Body))
            return internalResponse.Body.data

        return undefined
    }
}
