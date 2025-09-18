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
import { TStep } from "./types/TStep"
import { TStepArgsAnonymize, TStepArgsDebug, TStepArgsDelete, TStepArgsFields, TStepArgsInsert, TStepArgsJoin, TStepArgsListEntities, TStepArgsRemoveDuplicates, TStepArgsRemoveFields, TStepArgsRun, TStepArgsSelect, TStepArgsSort, TStepArgsSync, TStepArgsUpdate } from "./types/TStepArgs"


//
export type TFunctionStep = (step: TStep, $context?: Partial<TContext>) => Promise<DataTable | void>;
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
    static async Select(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsSelect>(step.stepArgs,
            `Step.Select: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`)

        const { currentSchemaName, currentDataTable, stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepArgs, new Sandbox($context)) as TSchemaRequestSelect

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
    static async Insert(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsInsert>(
            step.stepArgs,
            `Step.Insert: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
        )

        const { currentSchemaName, currentDataTable, stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestInsert>(stepArgs, new Sandbox($context)) as TSchemaRequestInsert

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        const { schema, entity, data } = $__schemaRequest

        if (!data && currentDataTable.Rows.length == 0)
            throw new WarnError(`Step.Insert: No data to insert ${JsonUtils.Stringify(step.stepArgs)}`)

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
            throw new WarnError(`Step.Insert: No data to insert ${JsonUtils.Stringify(step.stepArgs)}`)
        }

        // case no schema and no entity --> use current datatable
        if (!schema && !entity) {
            return currentDataTable.AddRows(data)
        }

        return currentDataTable
    }

    @Logger.LogFunction()
    static async Update(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsUpdate>(
            step.stepArgs,
            `Step.Update: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
        )

        const { currentSchemaName, currentDataTable, stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestUpdate>(stepArgs, new Sandbox($context)) as TSchemaRequestUpdate

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
            Logger.Error(`Step.Update: no data to update ${JsonUtils.Stringify(step.stepArgs)}`)
            throw new HttpErrorInternalServerError(`No data to update ${JsonUtils.Stringify(step.stepArgs)}`)
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
    static async Delete(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsDelete>(
            step.stepArgs,
            `Step.Delete: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
        )

        const { currentSchemaName, currentDataTable, stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestDelete>(stepArgs, new Sandbox($context)) as TSchemaRequestDelete

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
    static async Join(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsJoin>(
            step.stepArgs,
            `Step.Join: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
        )

        const { currentPlanName, currentDataTable, stepArgs } = step

        if (stepArgs === null)
            return currentDataTable

        const $__stepArgs = PlaceHolder.EvaluateJsCode<Record<string, string>>(stepArgs, new Sandbox($context)) as Record<string, string>

        const { schema, entity, type, leftField, rightField } = $__stepArgs

        let dtRight = new DataTable(entity)

        const requestToSchema: TStep = {
            ...step,
            currentDataTable: dtRight,
            stepArgs: {
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

        return await this._joinCaseMap[type](step.currentDataTable, dtRight, leftField, rightField) ??
            (Helper.CaseMapNotFound(type) && step.currentDataTable)
    }

    @Logger.LogFunction()
    static async Fields(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepArgsFields>(step.stepArgs, "Step.Fields: Wrong argument passed")

        const params = step.stepArgs

        if (params == "*")
            return step.currentDataTable

        if (Array.isArray(params)) {
            return step.currentDataTable.SelectFields(params)
        } else {
            Assert.Condition(!StringUtils.IsEmpty(params), "Step.Fields: cannot be empty")
            return step.currentDataTable.SelectFields(StringUtils.Split(params, ","))
        }
    }

    @Logger.LogFunction()
    static async Sort(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepArgsSort>(step.stepArgs, "Step.Sort: Wrong argument passed")

        const params = step.stepArgs
        const { currentDataTable } = step
        return currentDataTable.Sort(params)
    }

    @Logger.LogFunction()
    static async Debug(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepArgsDebug>(step.stepArgs, "Step.Debug: Wrong argument passed")

        const debug = step.stepArgs
        step.currentDataTable.SetMetaData(METADATA.PLAN_DEBUG, debug)

        if (step.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            step.currentDataTable.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return step.currentDataTable
    }

    @Logger.LogFunction(true)
    static async Run(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsRun>(step.stepArgs, "Step.Run: Wrong argument passed")

        const _stepArgs = merge(
            {
                output: null
            },
            step.stepArgs
        ) as TStepArgsRun

        const { ai, task, input, output } = _stepArgs
        const ai_task = `${ai}-${task}`
        const ai_engine = AiEngine.AiEnginesInstance.get(ai_task)

        Assert.Var<IAiEngine>(ai_engine, ai_engine !== undefined, `AI Engine ${ai_task} not found`)

        const promises = []

        for await (const [_rowIndex, _rowData] of step.currentDataTable.Rows.entries()) {
            promises.push((async () => {

                const __data = _rowData[input]
                const __result = <Record<string, any>>(await ai_engine.Run(
                    {
                        data: __data,
                        ...step.stepArgs as TStepArgsRun
                    } as TAiRunArguments
                )
                )

                if (!__result) {
                    return
                }

                // check if output is empty
                if (isNil(output) || isEmpty(output)) {
                    step.currentDataTable.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    step.currentDataTable.Rows[_rowIndex][ai_task] = JsonUtils.SafeCopy(__result)
                    return
                }

                // check if output is string
                if (isString(output)) {
                    step.currentDataTable.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    step.currentDataTable.Rows[_rowIndex][output] = __result
                    return
                }

                // else                
                for (const [___inField, ___outField] of Object.entries(output)) {
                    _rowData[___outField as string] = __result[___inField]
                }
                step.currentDataTable.Rows[_rowIndex] = _rowData
            })())
        }

        await Promise.all(promises)

        return step.currentDataTable.SetFields()
    }

    @Logger.LogFunction()
    static async Sync(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsSync>(step.stepArgs, "Step.Sync: Wrong argument passed")

        const stepArgs = step.stepArgs

        const $__stepArgs = PlaceHolder.EvaluateJsCode<TStepArgsSync>(stepArgs, new Sandbox($context)) as TStepArgsSync

        const { from, to, id } = $__stepArgs

        Assert.Var<string>(id, "'id' must be provided")
        Assert.Condition(from !== undefined || to !== undefined, "Either 'from' and 'to' must be provided")

        const dtSource: DataTable = (from)
            ? (await Step._select(from.schema, from.entity)) ?? new DataTable(from.entity)
            : step.currentDataTable

        const dtDestination: DataTable = (to)
            ? (await Step._select(to.schema, to.entity)) ?? new DataTable(to.entity)
            : step.currentDataTable


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
            step.currentDataTable.Rows = [
                ...syncReport.DeletedRows,
                ...syncReport.UpdatedRows,
                ...syncReport.AddedRows
            ]
        }

        return step.currentDataTable.SetFields()
    }

    @Logger.LogFunction(true)
    static async Anonymize(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepArgsAnonymize>(step.stepArgs, "Step.Anonymize: Wrong argument passed")
        return await step.currentDataTable.Anonymize(step.stepArgs)
    }

    @Logger.LogFunction(true)
    static async RemoveDuplicates(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsRemoveDuplicates>(step.stepArgs, "Step.RemoveDuplicates: Wrong argument passed")

        const {
            keys = undefined,
            condition = undefined,
            method = REMOVE_DUPLICATES_METHOD.HASH,
            strategy = REMOVE_DUPLICATES_STRATEGY.FIRST
        } = step.stepArgs as TStepArgsRemoveDuplicates

        const { currentDataTable } = step

        await currentDataTable.RemoveDuplicates(keys, method, strategy, condition)

        Logger.Debug(`${Logger.Out} Step.RemoveDuplicates: ${JsonUtils.Stringify(step.stepArgs)}`)
        return currentDataTable
    }

    @Logger.LogFunction(true)
    static async ListEntities(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsListEntities>(step.stepArgs, "Step.ListEntities: Wrong argument passed")

        const { currentDataTable, currentPlanName } = step
        const schemaRequest = step.stepArgs

        // schema is defined
        if (schemaRequest?.schema) {
            const _intResp = await Schema.ListEntities(<TSchemaRequest>schemaRequest)

            if (_intResp.Body && TypeUtils.IsSchemaResponseWithData(_intResp.Body)) {
                Logger.Debug(`${Logger.Out} Step.ListEntities: ${JsonUtils.Stringify(step.stepArgs)}`)
                return _intResp.Body.data
            }
        }

        // no schema passed, return list of plan entities

        const entitiesList: TDataListEntity[] = keys(ConfigManager.Get(`plans.${currentPlanName}`))
            .map((entity: string) => (<TDataListEntity>{
                name: entity,
                type: DATA_ENTITY_TYPE.PLAN_ENTITY
            }))

        Logger.Debug(`${Logger.Out} Step.ListEntities: ${JsonUtils.Stringify(step.stepArgs)}`)
        return new DataTable(currentDataTable.Name, entitiesList)
    }

    @Logger.LogFunction(true)
    static async RemoveFields(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepArgsRemoveFields>(step.stepArgs, step.stepArgs instanceof Array, "remove-fields: must be an array")
        return step.currentDataTable.RemoveFields(step.stepArgs)
    }

    @Logger.LogFunction(true)
    static async Break(_step: TStep, _$context?: Partial<TContext>): Promise<undefined> {
        throw new Error("__BREAK__")
    }
}
