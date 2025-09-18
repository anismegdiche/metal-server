//
//
// 
import isEmpty from "lodash/isEmpty"
import isNil from "lodash/isNil"
import isString from "lodash/isString"
import keys from "lodash/keys"
import map from "lodash/map"
import merge from "lodash/merge"
import omit from "lodash/omit"
//
import { DataTable, JOIN_TYPE, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, TRow } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { Assert } from "../../utils/Assert"
import { Helper } from "../../utils/Helper"
import { JsonUtils } from "../../utils/JsonUtils"
import { Logger } from "../../utils/Logger"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { StringUtils } from "../../utils/StringUtils"
import { TypeUtils } from "../../utils/TypeUtils"
import { TAiRunArguments } from "../ai-engine/@types"
import { AiEngine } from "../ai-engine/AiEngine"
import { IAiEngine } from "../ai-engine/base/IAiEngine"
import { METADATA } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { HttpErrorInternalServerError } from "../errors/HttpErrors"
import { WarnError } from "../errors/InternalError"
import { Sandbox } from "../sandbox/Sandbox"
import { TContext } from "../sandbox/types/TContext"
import { Schema } from "../schema/Schema"
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate } from '../schema/types/TSchemaRequest'
import { DATA_ENTITY_TYPE } from "../source/@consts"
import { MemoryData } from "../source/providers/MemoryData"
import { TDataListEntity } from "../source/types/TDataListEntity"
import { TOptionalParameter } from "../source/types/TOptionalParameter"
import { STEP } from "./@consts"
import { Plans } from "./Plans"
import { TStepAnonymize, TStepDebug, TStepDelete, TStepFields, TStepInsert, TStepJoin, TStepListEntities, TStepRemoveDuplicates, TStepRemoveFields, TStepRun, TStepSelect, TStepSort, TStepSync, TStepUpdate } from "./types/TStep"
import { TStepArguments } from "./types/TStepArguments"


//
export type TFunctionStep = (stepArguments: TStepArguments, $context?: Partial<TContext>) => Promise<DataTable | void>;
export type TFunctionJoin = (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => Promise<DataTable>;


//
export class Step {

    private static readonly _dataProvider = new MemoryData()

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
        [STEP.LIST_ENTITIES]: Step.ListEntities,
        [STEP.REMOVE_FIELDS]: Step.RemoveFields,
        [STEP.BREAK]: Step.Break
    }

    private static _joinCaseMap: Record<string, TFunctionJoin> = {
        [JOIN_TYPE.LEFT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.LeftJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.RIGHT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.RightJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.INNER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.InnerJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.FULL_OUTER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.FullOuterJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.CROSS]: async (dtLeft: DataTable, dtRight: DataTable) => dtLeft.CrossJoin(dtRight)
    }

    @Logger.LogFunction()
    static async Select(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepSelect>(stepArguments.stepParams,
            `Step.Select: Wrong argument passed ${JsonUtils.Stringify(stepArguments.stepParams)}`)

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepParams, new Sandbox($context)) as TSchemaRequestSelect

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        const { schema, entity } = $__schemaRequest

        // FIXME recheck logic for schema=null
        if (entity) {
            const _intResp = await Schema.Select(<TSchemaRequestSelect>{
                ...$__schemaRequest,
                schema: schema ?? currentSchemaName
            })

            if (_intResp.Body && TypeUtils.IsSchemaResponseWithData(_intResp.Body))
                return _intResp.Body.data
        }

        // case no schema and no entity --> use current datatable
        // FIXME missing options.cache
        if (!schema && !entity) {
            const _options: TOptionalParameter = Step._dataProvider.Options.Parse($__schemaRequest, $context)
            const sqlQueryHelper = Step._dataProvider.GenerateSqlSelect(<TSchemaRequestSelect>{
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

    private static async _select(schema: string, entity: string): Promise<DataTable | undefined> {
        const intResp = await Schema.Select({
            schema,
            entity
        })

        if (intResp.Body && TypeUtils.IsSchemaResponseWithData(intResp.Body))
            return intResp.Body.data

        return undefined
    }

    @Logger.LogFunction()
    static async Insert(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepInsert>(
            stepArguments.stepParams,
            `Step.Insert: Wrong argument passed ${JsonUtils.Stringify(stepArguments.stepParams)}`
        )

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestInsert>(stepParams, new Sandbox($context)) as TSchemaRequestInsert

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        const { schema, entity, data } = $__schemaRequest

        if (!data && currentDataTable.Rows.length == 0)
            throw new WarnError(`Step.Insert: No data to insert ${JsonUtils.Stringify(stepArguments.stepParams)}`)

        // FIXME recheck logic for schema=null
        if (entity) {
            await Schema.Insert(<TSchemaRequestInsert>{
                ...$__schemaRequest,
                schema: schema ?? currentSchemaName,
                data: data ?? currentDataTable.Rows
            })

            return currentDataTable
        }

        if (!data) {
            throw new WarnError(`Step.Insert: No data to insert ${JsonUtils.Stringify(stepArguments.stepParams)}`)
        }

        // case no schema and no entity --> use current datatable
        if (!schema && !entity) {
            return currentDataTable.AddRows(data)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Update(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepUpdate>(
            stepArguments.stepParams,
            `Step.Update: Wrong argument passed ${JsonUtils.Stringify(stepArguments.stepParams)}`
        )

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestUpdate>(stepParams, new Sandbox($context)) as TSchemaRequestUpdate

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        const { schema, entity, data } = $__schemaRequest

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        if (!data) {
            Logger.Error(`Step.Update: no data to update ${JsonUtils.Stringify(stepArguments.stepParams)}`)
            throw new HttpErrorInternalServerError(`No data to update ${JsonUtils.Stringify(stepArguments.stepParams)}`)
        }

        // FIXME recheck logic for schema=null
        if (entity) {
            await Schema.Update({
                ...$__schemaRequest,
                schema: schema ?? currentSchemaName
            })

            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        if (!schema && !entity) {
            const _options: TOptionalParameter = Step._dataProvider.Options.Parse($__schemaRequest, $context)
            const _sqlQueryHelper = Step._dataProvider.GenerateSqlUpdate(<TSchemaRequestUpdate>{
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

        Assert.Var<TStepDelete>(
            stepArguments.stepParams,
            `Step.Delete: Wrong argument passed ${JsonUtils.Stringify(stepArguments.stepParams)}`
        )

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestDelete>(stepParams, new Sandbox($context)) as TSchemaRequestDelete

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        const { schema, entity } = $__schemaRequest

        // FIXME recheck logic for schema=null
        if (entity) {
            await Schema.Delete({
                ...$__schemaRequest,
                schema: schema ?? currentSchemaName
            })

            return currentDataTable
        }

        // case no schema and no entity --> use current datatable
        // FIXME step delete: missing $context
        if (!schema && !entity) {
            const _options: TOptionalParameter = Step._dataProvider.Options.Parse($__schemaRequest, $context)
            const _sqlQueryHelper = Step._dataProvider.GenerateSqlDelete(<TSchemaRequestDelete>{
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

        Assert.Var<TStepJoin>(
            stepArguments.stepParams,
            `Step.Join: Wrong argument passed ${JsonUtils.Stringify(stepArguments.stepParams)}`
        )

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
            : await Plans.Plans.get(currentPlanName)!.ProcessSchemaRequest(requestToCurrentPlan)

        return await this._joinCaseMap[type](stepArguments.currentDataTable, dtRight, leftField, rightField) ??
            (Helper.CaseMapNotFound(type) && stepArguments.currentDataTable)
    }

    @Logger.LogFunction()
    static async Fields(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepFields>(stepArguments.stepParams, "Step.Fields: Wrong argument passed")

        const params = stepArguments.stepParams

        if (params == "*")
            return stepArguments.currentDataTable

        if (Array.isArray(params)) {
            return stepArguments.currentDataTable.SelectFields(params)
        } else {
            Assert.Condition(!StringUtils.IsEmpty(params), "Step.Fields: cannot be empty")
            return stepArguments.currentDataTable.SelectFields(StringUtils.Split(params, ","))
        }
    }

    @Logger.LogFunction()
    static async Sort(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepSort>(stepArguments.stepParams, "Step.Sort: Wrong argument passed")

        const params = stepArguments.stepParams
        const { currentDataTable } = stepArguments
        return currentDataTable.Sort(params)
    }

    @Logger.LogFunction()
    static async Debug(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepDebug>(stepArguments.stepParams, "Step.Debug: Wrong argument passed")

        const debug = stepArguments.stepParams
        stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_DEBUG, debug)

        if (stepArguments.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return stepArguments.currentDataTable
    }

    @Logger.LogFunction(true)
    static async Run(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepRun>(stepArguments.stepParams, "Step.Run: Wrong argument passed")

        const _stepParams = merge(
            {
                output: null
            },
            stepArguments.stepParams
        ) as TStepRun

        const { ai, task, input, output } = _stepParams
        const ai_task = `${ai}-${task}`
        const ai_engine = AiEngine.AiEnginesInstance.get(ai_task)

        Assert.Var<IAiEngine>(ai_engine, ai_engine !== undefined, `AI Engine ${ai_task} not found`)

        const promises = []

        for await (const [_rowIndex, _rowData] of stepArguments.currentDataTable.Rows.entries()) {
            promises.push((async () => {

                const __data = _rowData[input]
                const __result = <Record<string, any>>(await ai_engine.Run(
                    {
                        data: __data,
                        ...stepArguments.stepParams as TStepRun
                    } as TAiRunArguments
                )
                )

                if (!__result) {
                    return
                }

                // check if output is empty
                if (isNil(output) || isEmpty(output)) {
                    stepArguments.currentDataTable.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    stepArguments.currentDataTable.Rows[_rowIndex][ai_task] = JsonUtils.SafeCopy(__result)
                    return
                }

                // check if output is string
                if (isString(output)) {
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

        Assert.Var<TStepSync>(stepArguments.stepParams, "Step.Sync: Wrong argument passed")

        const stepParams = stepArguments.stepParams

        const $__stepParams = PlaceHolder.EvaluateJsCode<TStepSync>(stepParams, new Sandbox($context)) as TStepSync

        const { from, to, id } = $__stepParams

        Assert.Var<string>(id, "'id' must be provided")
        Assert.Condition(from !== undefined || to !== undefined, "Either 'from' and 'to' must be provided")

        const dtSource: DataTable = (from)
            ? (await Step._select(from.schema, from.entity)) ?? new DataTable(from.entity)
            : stepArguments.currentDataTable

        const dtDestination: DataTable = (to)
            ? (await Step._select(to.schema, to.entity)) ?? new DataTable(to.entity)
            : stepArguments.currentDataTable


        const syncReport = dtSource.SyncReport(dtDestination, id, {
            keepOnlyUpdatedValues: true
        })

        // Apply transformations
        //// Delete

        map(syncReport.DeletedRows, id)
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

            data: [omit(row, id)]
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

    @Logger.LogFunction(true)
    static async Anonymize(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepAnonymize>(stepArguments.stepParams, "Step.Anonymize: Wrong argument passed")

        const fields = stepArguments.stepParams
        return await stepArguments.currentDataTable.Anonymize(fields)
    }

    @Logger.LogFunction(true)
    static async RemoveDuplicates(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepRemoveDuplicates>(stepArguments.stepParams, "Step.RemoveDuplicates: Wrong argument passed")

        const {
            keys = undefined,
            condition = undefined,
            method = REMOVE_DUPLICATES_METHOD.HASH,
            strategy = REMOVE_DUPLICATES_STRATEGY.FIRST
        } = stepArguments.stepParams as TStepRemoveDuplicates

        const { currentDataTable } = stepArguments

        await currentDataTable.RemoveDuplicates(keys, method, strategy, condition)

        Logger.Debug(`${Logger.Out} Step.RemoveDuplicates: ${JsonUtils.Stringify(stepArguments.stepParams)}`)
        return currentDataTable
    }

    @Logger.LogFunction(true)
    static async ListEntities(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepListEntities>(stepArguments.stepParams, "Step.ListEntities: Wrong argument passed")

        const { currentDataTable, currentPlanName } = stepArguments
        const schemaRequest = stepArguments.stepParams

        // schema is defined
        if (schemaRequest?.schema) {
            const _intResp = await Schema.ListEntities(<TSchemaRequest>schemaRequest)

            if (_intResp.Body && TypeUtils.IsSchemaResponseWithData(_intResp.Body)) {
                Logger.Debug(`${Logger.Out} Step.ListEntities: ${JsonUtils.Stringify(stepArguments.stepParams)}`)
                return _intResp.Body.data
            }
        }

        // no schema passed, return list of plan entities

        const entitiesList: TDataListEntity[] = keys(ConfigManager.Get(`plans.${currentPlanName}`))
            .map((entity: string) => (<TDataListEntity>{
                name: entity,
                type: DATA_ENTITY_TYPE.PLAN_ENTITY
            }))

        Logger.Debug(`${Logger.Out} Step.ListEntities: ${JsonUtils.Stringify(stepArguments.stepParams)}`)
        return new DataTable(currentDataTable.Name, entitiesList)
    }

    @Logger.LogFunction(true)
    static async RemoveFields(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepRemoveFields>(stepArguments.stepParams, stepArguments.stepParams instanceof Array, "remove-fields: must be an array")
        return stepArguments.currentDataTable.RemoveFields(stepArguments.stepParams)
    }

    @Logger.LogFunction(true)
    static async Break(_stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<undefined> {
        throw new Error("__BREAK__")
    }
}
