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
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate } from "../types/TSchemaRequest"
import { StringHelper } from "../lib/StringHelper"
import { AiEngine } from "./AiEngine"
import { Schema } from "./Schema"
import { TOptionalParameter } from "../types/TOptionalParameter"
import { TypeHelper } from "../lib/TypeHelper"
import { Plan } from "./Plan"
import { WarnError } from "./InternalError"
import { JsonHelper } from "../lib/JsonHelper"
import { TStepSync, TStepRemoveDuplicates, TStepSort, TStepRun, TStepListEntities } from "../types/TStep"
import { HttpErrorInternalServerError } from "./HttpErrors"
import { Config } from "./Config"
import { MemoryData } from "../providers/data/MemoryData"
import { TContext } from "../@types/TContext"
import { PlaceHolder } from "../utils/PlaceHolder"
import { Sandbox } from "./Sandbox"


//
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


//
export type TStepArguments = {
    currentSchemaName: string
    currentPlanName: string
    currentDataTable: DataTable
    stepParams?: TSchemaRequest | TJson | string
}

type TFunctionStep = (stepArguments: TStepArguments, $context?: Partial<TContext>) => Promise<DataTable>


//
export class Step {

    static readonly DataProvider = new MemoryData()

    static ExecuteCaseMap: Record<string, TFunctionStep> = {
        [STEP.DEBUG]: Step.Debug,
        [STEP.SELECT]: Step.Select,
        [STEP.UPDATE]: Step.Update,
        [STEP.DELETE]: Step.Delete,
        [STEP.INSERT]: Step.Insert,
        [STEP.JOIN]: Step.Join,
        [STEP.FIELDS]: Step.Fields,
        [STEP.SORT]: Step.Sort,
        [STEP.RUN]: Step.Run,
        [STEP.SYNC]: Step.Sync,
        [STEP.ANONYMIZE]: Step.Anonymize,
        [STEP.REMOVE_DUPLICATE]: Step.RemoveDuplicates,
        [STEP.LIST_ENTITIES]: Step.ListEntities
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
    static async Select(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams))
            throw new HttpErrorInternalServerError(`Step.Select: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepParams, new Sandbox($context)) as TSchemaRequestSelect

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            Step.DataProvider.GetContext($__schemaRequest)
        )

        const { schema, entity } = $__schemaRequest

        // TODO recheck logic for schema=null
        if (entity) {
            const _intResp = await Schema.Select(<TSchemaRequestSelect>{
                ...$__schemaRequest,
                schema: schema ?? currentSchemaName
            })

            if (_intResp.Body && TypeHelper.IsSchemaResponseData(_intResp.Body))
                return _intResp.Body.data
        }

        // case no schema and no entity --> use current datatable
        // TODO missing options.cache
        if (!schema && !entity) {
            const _options: TOptionalParameter = Step.DataProvider.Options.Parse($__schemaRequest, $context)
            const sqlQueryHelper = Step.DataProvider.GenerateSqlSelect(<TSchemaRequestSelect>{
                entity: currentDataTable.Name
            },
                _options
            )

            const sqlQuery = (_options.Fields != "*" || _options.Filter != undefined || _options.Sort != undefined || _options.Data != undefined)
                ? sqlQueryHelper.Query()
                : undefined

            const sqlData = (_options.Fields != "*" || _options.Filter != undefined || _options.Sort != undefined || _options.Data != undefined)
                ? sqlQueryHelper.Data
                : undefined

            return await currentDataTable.FreeSqlAsync(sqlQuery, sqlData)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Insert(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams))
            throw new HttpErrorInternalServerError(`Step.Insert: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestInsert>(stepParams, new Sandbox($context)) as TSchemaRequestInsert
        
        // eslint-disable-next-line no-param-reassign
        $context = _.merge(//NOSONAR
            $context,
            Step.DataProvider.GetContext($__schemaRequest)
        )
        
        const { schema, entity, data } = $__schemaRequest

        if (!data && currentDataTable.Rows.length == 0)
            throw new WarnError(`Step.Insert: No data to insert ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        // TODO recheck logic for schema=null
        if (entity) {
            await Schema.Insert(<TSchemaRequestInsert>{
                ...$__schemaRequest,
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
            return currentDataTable.AddRows(data)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Update(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams))
            throw new HttpErrorInternalServerError(`Step.Update: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestUpdate>(stepParams, new Sandbox($context)) as TSchemaRequestUpdate

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            Step.DataProvider.GetContext($__schemaRequest)
        )

        const { schema, entity, data } = $__schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            Step.DataProvider.GetContext($__schemaRequest)
        )

        if (!data) {
            Logger.Error(`Step.Update: no data to update ${JsonHelper.Stringify(stepArguments.stepParams)}`)
            throw new HttpErrorInternalServerError(`No data to update ${JsonHelper.Stringify(stepArguments.stepParams)}`)
        }

        // TODO recheck logic for schema=null
        if (entity) {
            await Schema.Update({
                ...$__schemaRequest,
                schema: schema ?? currentSchemaName
            })

            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        if (!schema && !entity) {
            const _options: TOptionalParameter = Step.DataProvider.Options.Parse($__schemaRequest, $context)
            const _sqlQueryHelper = Step.DataProvider.GenerateSqlUpdate(<TSchemaRequestUpdate>{
                entity: currentDataTable.Name
            },
                _options
            )

            return await currentDataTable.FreeSqlAsync(_sqlQueryHelper.Query(), _sqlQueryHelper.Data)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Delete(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        if (!TypeHelper.IsSchemaRequest(stepArguments.stepParams))
            throw new HttpErrorInternalServerError(`Step.Delete: Wrong argument passed ${JsonHelper.Stringify(stepArguments.stepParams)}`)

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestDelete>(stepParams, new Sandbox($context)) as TSchemaRequestDelete

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            Step.DataProvider.GetContext($__schemaRequest)
        )

        const { schema, entity } = $__schemaRequest

        // TODO recheck logic for schema=null
        if (entity) {
            await Schema.Delete({
                ...$__schemaRequest,
                schema: schema ?? currentSchemaName
            })

            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        // CURRENT missing $context
        if (!schema && !entity) {
            const _options: TOptionalParameter = Step.DataProvider.Options.Parse($__schemaRequest, $context)
            const _sqlQueryHelper = Step.DataProvider.GenerateSqlDelete(<TSchemaRequestDelete>{
                entity: currentDataTable.Name
            },
                _options
            )

            await currentDataTable.FreeSqlAsync(_sqlQueryHelper.Query(), _sqlQueryHelper.Data)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Join(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        const { currentPlanName, currentDataTable, stepParams } = stepArguments

        if (stepParams === null)
            return currentDataTable

        const $__stepParams = PlaceHolder.EvaluateJsCode<Record<string, string>>(stepParams, new Sandbox($context)) as Record<string, string>

        const { schema, entity, type, leftField, rightField } = $__stepParams

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
            : await Plan.ProcessSchemaRequest(requestToCurrentPlan)

        return await this.JoinCaseMap[type](stepArguments.currentDataTable, dtRight, leftField, rightField) ??
            (Helper.CaseMapNotFound(type) && stepArguments.currentDataTable)
    }


    @Logger.LogFunction()
    static async Fields(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        const stepParams: string = stepArguments.stepParams as string
        if (stepParams == "*")
            return stepArguments.currentDataTable

        if (StringHelper.IsEmpty(stepParams))
            throw new HttpErrorInternalServerError("fields: cannot be empty")

        const fields = StringHelper.Split(stepParams, ",")
        return stepArguments.currentDataTable.SelectFields(fields)
    }

    @Logger.LogFunction()
    static async Sort(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {

        const stepParams = stepArguments.stepParams as TStepSort
        const { currentDataTable } = stepArguments

        // eslint-disable-next-line you-dont-need-lodash-underscore/keys
        const fields = _.keys(stepParams)
        // eslint-disable-next-line you-dont-need-lodash-underscore/values
        const orders: TSortOrder[] = _.values(stepParams)

        return currentDataTable.Sort(fields, orders)
    }

    @Logger.LogFunction()
    static async Debug(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        const debug = stepArguments.stepParams as string ?? "error"
        stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_DEBUG, debug)

        if (stepArguments.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return stepArguments.currentDataTable
    }

    @Logger.LogFunction()
    static async Run(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {

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
    static async Sync(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        const stepParams = stepArguments.stepParams as TStepSync

        const $__stepParams = PlaceHolder.EvaluateJsCode<TStepSync>(stepParams, new Sandbox($context)) as TStepSync

        const { from, to, id } = $__stepParams

        if (!id)
            throw new HttpErrorInternalServerError("'id' must be provided")

        if (!from && !to)
            throw new HttpErrorInternalServerError("Either 'from' and 'to' must be provided")

        const dtSource: DataTable = (from)
            ? (await Step.#_Select(from.schema, from.entity)) ?? new DataTable(from.entity)
            : stepArguments.currentDataTable

        const dtDestination: DataTable = (to)
            ? (await Step.#_Select(to.schema, to.entity)) ?? new DataTable(to.entity)
            : stepArguments.currentDataTable


        const syncReport = dtSource.SyncReport(dtDestination, id, {
            keepOnlyUpdatedValues: true
        })

        // Apply transformations
        //// Delete
        // eslint-disable-next-line you-dont-need-lodash-underscore/map
        _.map(syncReport.DeletedRows, id)
            .forEach((value: unknown) => Schema.Delete({
                schema: to.schema,
                entity: to.entity,
                filter: {
                    [id]: value
                }
            }))

        //// Update
        syncReport.UpdatedRows.forEach((row: TRow) => Schema.Update({
            schema: to.schema,
            entity: to.entity,
            filter: {
                [id]: row[id]
            },
            // eslint-disable-next-line you-dont-need-lodash-underscore/omit
            data: [_.omit(row, id)]
        }))

        //// Insert
        if (syncReport.AddedRows.length > 0) {
            Schema.Insert({
                schema: to.schema,
                entity: to.entity,
                data: syncReport.AddedRows
            })
        }

        // if no destination
        if (!to) {
            stepArguments.currentDataTable.Rows = [
                ...syncReport.DeletedRows,
                ...syncReport.UpdatedRows,
                ...syncReport.AddedRows
            ]
        }

        return stepArguments.currentDataTable.SetFields()
    }

    @Logger.LogFunction()
    static async Anonymize(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        const stepParams: string = stepArguments.stepParams as string
        const fieldsToAnonymize = StringHelper.Split(stepParams, ",")
        return stepArguments.currentDataTable.Anonymize(fieldsToAnonymize)
    }

    @Logger.LogFunction()
    static async RemoveDuplicates(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {

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
    static async ListEntities(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {

        const { currentDataTable, currentPlanName } = stepArguments
        const schemaRequest = stepArguments.stepParams as TStepListEntities

        // schema is defined
        if (schemaRequest?.schema) {
            const _intResp = await Schema.ListEntities(<TSchemaRequest>schemaRequest)

            if (_intResp.Body && TypeHelper.IsSchemaResponseData(_intResp.Body)) {
                Logger.Debug(`${Logger.Out} Step.ListEntities: ${JsonHelper.Stringify(stepArguments.stepParams)}`)
                return _intResp.Body.data
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
        const intResp = await Schema.Select({
            schema,
            entity
        })

        if (intResp.Body && TypeHelper.IsSchemaResponseData(intResp.Body))
            return intResp.Body.data

        return undefined
    }
}
