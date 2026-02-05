//
//
// 
import { isEmpty, isObject, isString, keys, map, merge, omit, omitBy } from "lodash-es"

//
import type { TOrderBy, TRow } from "../../types/DataTable"
import { DataTable, dataTable_fieldIsSystem } from "../../types/DataTable"
import type { TJson } from "../../types/TJson"
import type { TUuidv7 } from "../../types/TUuidv7"
import { Assert } from "../../utils/Assert"
import { DataTableUtils, JOIN_TYPE } from "../../utils/DataTableUtils"
import { Helper } from "../../utils/Helper"
import { JsonUtils } from "../../utils/JsonUtils"
import { Logger } from "../../utils/Logger"
import { PlaceHolder, RX_JS_CODE } from "../../utils/PlaceHolder"
import { StringUtils } from "../../utils/StringUtils"
import type { TAiArguments } from "../ai-engine/@types"
import { AiEngine } from "../ai-engine/AiEngine"
import type { IAiEngine } from "../ai-engine/base/IAiEngine"
import { METADATA } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../errors/HttpErrors"
import { Sandbox } from "../sandbox/Sandbox"
import type { TContext } from "../sandbox/types/TContext"
import { Schema } from "../schema/Schema"
import type { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../schema/types/TSchemaRequest'
import { z_TSchemaResponse } from "../schema/types/TSchemaResponse"
import { DATA_ENTITY_TYPE } from "../source/@consts"
import { MemoryData } from "../source/providers/MemoryData"
import type { TDataListEntity } from "../source/types/TDataListEntity"
import type { TOptionalParameter } from "../source/types/TOptionalParameter"
import { STEP } from "./@consts"
import { Plans } from "./Plans"
import type { TStep } from "./types/TStep"
import type {
    U_config_plans_plan_entity_anonymize_Params,
    U_config_plans_plan_entity_break_Params,
    U_config_plans_plan_entity_debug_Params,
    U_config_plans_plan_entity_delete_Params,
    U_config_plans_plan_entity_insert_Params,
    U_config_plans_plan_entity_join_Params,
    U_config_plans_plan_entity_list_entities_Params,
    U_config_plans_plan_entity_omit_Params,
    U_config_plans_plan_entity_pick_Params,
    U_config_plans_plan_entity_remove_duplicates_Params,
    U_config_plans_plan_entity_run_Params,
    U_config_plans_plan_entity_select_Params,
    U_config_plans_plan_entity_sort_Params,
    U_config_plans_plan_entity_sync_Params,
    U_config_plans_plan_entity_update_Params
} from "./types/U_config_plans_plan_entity_step"
import {
    z_U_config_plans_plan_entity_anonymize_Params,
    z_U_config_plans_plan_entity_break_Params,
    z_U_config_plans_plan_entity_debug_Params,
    z_U_config_plans_plan_entity_delete_Params,
    z_U_config_plans_plan_entity_insert_Params,
    z_U_config_plans_plan_entity_join_Params,
    z_U_config_plans_plan_entity_list_entities_Params,
    z_U_config_plans_plan_entity_omit_Params,
    z_U_config_plans_plan_entity_pick_Params,
    z_U_config_plans_plan_entity_remove_duplicates_Params,
    z_U_config_plans_plan_entity_run_Params,
    z_U_config_plans_plan_entity_select_Params,
    z_U_config_plans_plan_entity_sort_Params,
    z_U_config_plans_plan_entity_sync_Params,
    z_U_config_plans_plan_entity_update_Params
} from "./types/U_config_plans_plan_entity_step"


//
export type TFunctionStep = (step: TStep, $context?: Partial<TContext>) => Promise<DataTable | void>;
export type TFunctionJoin = (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => Promise<DataTable>;


//
export class Step {

    static readonly _dataProvider = new MemoryData()

    static readonly ExecuteCaseMap: Record<string, TFunctionStep> = {
        [STEP.DEBUG]: Step.Debug,
        [STEP.SELECT]: Step.Select,
        [STEP.UPDATE]: Step.Update,
        [STEP.DELETE]: Step.Delete,
        [STEP.INSERT]: Step.Insert,
        [STEP.JOIN]: Step.Join,
        [STEP.FIELDS]: Step.Pick,
        [STEP.SORT]: Step.Sort,
        [STEP.RUN]: Step.Run,
        [STEP.SYNC]: Step.Sync,
        [STEP.ANONYMIZE]: Step.Anonymize,
        [STEP.REMOVE_DUPLICATE]: Step.RemoveDuplicates,
        [STEP.LIST_ENTITIES]: Step.ListEntities,
        [STEP.BREAK]: Step.Break,
        [STEP.PICK]: Step.Pick,
        [STEP.OMIT]: Step.Omit
    }

    static readonly _joinCaseMap: Record<string, TFunctionJoin> = {
        [JOIN_TYPE.LEFT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => DataTableUtils.LeftJoin(dtLeft, dtRight, leftField, rightField),
        [JOIN_TYPE.RIGHT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => DataTableUtils.RightJoin(dtLeft, dtRight, leftField, rightField),
        [JOIN_TYPE.INNER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => DataTableUtils.InnerJoin(dtLeft, dtRight, leftField, rightField),
        [JOIN_TYPE.FULL_OUTER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => DataTableUtils.FullOuterJoin(dtLeft, dtRight, leftField, rightField),
        [JOIN_TYPE.CROSS]: async (dtLeft: DataTable, dtRight: DataTable) => DataTableUtils.CrossJoin(dtLeft, dtRight)
    }

    @Logger.LogFunction()
    static async Select(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<U_config_plans_plan_entity_select_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_select_Params.safeParse(step.stepArgs).success,
            `${Logger.Out} ${STEP.SELECT}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`)

        const { stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepArgs, new Sandbox($context)) as TSchemaRequestSelect

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        return ($__schemaRequest.schema && $__schemaRequest.entity)
            ? await Step._selectSchema(step)
            : await Step._selectPlan(step, $context)
    }

    private static async _selectSchema(step: TStep): Promise<DataTable> {

        const { currentSchemaName, stepArgs } = step
        const schemaRequest = stepArgs as TSchemaRequestSelect
        const { schema, entity } = schemaRequest

        // only schema --> error
        Assert.Var<string>(entity, `${STEP.SELECT}: entity is required`)
        Assert.Var<string>(schema, `${STEP.SELECT}: schema is required`)

        // data from schema
        const _intResp = await Schema.Select(<TSchemaRequestSelect>{
            ...schemaRequest,
            schema: schema ?? currentSchemaName
        })

        if (_intResp.Body && Schema.IsSchemaResponse(_intResp.Body) && (await _intResp.Body.data.Count()) > 0)
            return _intResp.Body.data
        else
            throw new HttpErrorInternalServerError(`${Logger.Out} ${STEP.SELECT}: Schema '${schema}' and entity '${entity}' are not valid`)
    }

    private static async _selectPlan(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        const { currentSchemaName, currentDataTable, stepArgs } = step
        const schemaRequest = stepArgs as TSchemaRequestSelect
        const { entity } = schemaRequest

        const _options: TOptionalParameter = Step._dataProvider.Options.Parse(schemaRequest, $context)

        if (entity) {
            // data from current plan entity
            const data = await Plans.Plans.get(step.currentPlanName)?.ProcessSchemaRequest(<TSchemaRequestSelect>{
                ...schemaRequest,
                schema: currentSchemaName,
                entity: entity
            })

            if (!data)
                throw new HttpErrorNotFound(`${Logger.Out} ${STEP.SELECT}: Entity ${entity} not found in plan ${step.currentPlanName}`)

            const sqlQueryHelper = Step._dataProvider.GenerateSqlSelect(<TSchemaRequestSelect>{
                entity: data.Name
            },
                _options
            )

            const sqlQuery = Step._dataProvider.GetSqlQuery(sqlQueryHelper, _options)
            return data.FreeSql({ sqlQuery, queryParams: sqlQueryHelper.QueryParams })
        } else {
            // data from current datatable
            const sqlQueryHelper = Step._dataProvider.GenerateSqlSelect(<TSchemaRequestSelect>{
                entity: currentDataTable.Name
            },
                _options
            )

            const sqlQuery = Step._dataProvider.GetSqlQuery(sqlQueryHelper, _options)
            return currentDataTable.FreeSql({ sqlQuery, queryParams: sqlQueryHelper.QueryParams })
        }
    }

    private static async _select(schema: string, entity: string): Promise<DataTable | undefined> {
        const intResp = await Schema.Select({
            schema,
            entity
        })

        if (intResp.Body && Schema.IsSchemaResponse(intResp.Body) && (await intResp.Body.data.Count()) > 0)
            return intResp.Body.data

        return undefined
    }

    @Logger.LogFunction()
    static async Insert(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<U_config_plans_plan_entity_insert_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_insert_Params.safeParse(step.stepArgs).success,
            `${Logger.Out} ${STEP.INSERT}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
        )

        const { currentDataTable, stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestInsert>(stepArgs, new Sandbox($context)) as TSchemaRequestInsert

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        const { schema } = $__schemaRequest

        // case schema
        if (schema) {
            await Step._insertSchema(step)
            return currentDataTable
        } else {
            return Step._insertPlan(step)
        }
    }

    private static async _insertSchema(step: TStep, _$context?: Partial<TContext>): Promise<void> {

        const { currentSchemaName, currentDataTable, stepArgs } = step
        const schemaRequest = stepArgs as TSchemaRequestInsert
        const { schema, entity, data } = schemaRequest

        // only schema --> error
        Assert.Var<string>(entity, `${STEP.INSERT}: entity is required`)
        // At least one have data
        Assert.Condition((data as TRow[])?.length > 0 || await currentDataTable.Count() > 0, `${STEP.INSERT}: No data to insert ${JsonUtils.Stringify(step.stepArgs)}`)

        await Schema.Insert(<TSchemaRequestInsert>{
            ...schemaRequest,
            schema: schema ?? currentSchemaName,
            data: (data) ?? await currentDataTable.Rows()
        })
    }

    private static async _insertPlan(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        const { currentDataTable, stepArgs } = step
        const $__schemaRequest = stepArgs as TSchemaRequestInsert
        const { entity, data } = $__schemaRequest

        // entity given --> error
        Assert.Var<string>(entity, !entity, `${STEP.INSERT}: entity should not be given`)

        // At least one have data
        Assert.Condition((data as TRow[])?.length > 0, `${STEP.INSERT}: No data to insert ${JsonUtils.Stringify(step.stepArgs)}`)

        return currentDataTable.RowsAdd(data)
    }

    @Logger.LogFunction()
    static async Update(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<U_config_plans_plan_entity_update_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_update_Params.safeParse(step.stepArgs).success,
            `${Logger.Out} ${STEP.UPDATE}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
        )

        const { currentDataTable, stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestUpdate>(stepArgs, new Sandbox($context)) as TSchemaRequestUpdate

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        const { schema } = $__schemaRequest

        // case schema
        if (schema) {
            await Step._updateSchema(step)
            return currentDataTable
        } else {
            return Step._updatePlan(step)
        }
    }

    private static async _updateSchema(step: TStep, _$context?: Partial<TContext>): Promise<void> {

        const { currentSchemaName, currentDataTable, stepArgs } = step
        const $__schemaRequest = stepArgs as TSchemaRequestUpdate
        const { schema, entity, data } = $__schemaRequest

        // only schema --> error
        Assert.Var<string>(entity, `${STEP.UPDATE}: entity is required`)
        // At least one have data
        Assert.Condition((data as TRow[])?.length > 0 || await currentDataTable.Count() > 0, `${STEP.UPDATE}: No data to insert ${JsonUtils.Stringify(step.stepArgs)}`)

        await Schema.Update(<TSchemaRequestUpdate>{
            ...$__schemaRequest,
            schema: schema ?? currentSchemaName,
            data: (data) ?? await currentDataTable.Rows()
        })
    }

    private static async _updatePlan(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
        const { currentDataTable, stepArgs } = step
        const $__schemaRequest = stepArgs as TSchemaRequestUpdate
        const { entity, data } = $__schemaRequest

        // entity given --> error
        Assert.Var<string>(entity, !entity, `${STEP.UPDATE}: entity should not be given`)

        // At least one have data
        Assert.Condition((data as TRow[])?.length > 0, `${STEP.UPDATE}: No data to update ${JsonUtils.Stringify(step.stepArgs)}`)

        const _options: TOptionalParameter = Step._dataProvider.Options.Parse($__schemaRequest, $context)
        const _sqlQueryHelper = await Step._dataProvider.GenerateSqlUpdate(<TSchemaRequestUpdate>{
            entity: currentDataTable.Name
        },
            _options
        )

        return currentDataTable.FreeSql({ sqlQuery: _sqlQueryHelper.Query(), queryParams: _sqlQueryHelper.QueryParams })
    }

    @Logger.LogFunction()
    static async Delete(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {


        Assert.Var<U_config_plans_plan_entity_delete_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_delete_Params.safeParse(step.stepArgs).success,
            `${Logger.Out} ${STEP.DELETE}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
        )

        const { currentDataTable, stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestUpdate>(stepArgs, new Sandbox($context)) as TSchemaRequestUpdate

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        const { schema } = $__schemaRequest

        // case schema
        if (schema) {
            await Step._deleteSchema(step)
            return currentDataTable
        } else {
            return Step._deletePlan(step)
        }
    }

    private static async _deleteSchema(step: TStep, _$context?: Partial<TContext>): Promise<void> {

        const { currentSchemaName, stepArgs } = step
        const $__schemaRequest = stepArgs as TSchemaRequestDelete
        const { schema, entity } = $__schemaRequest

        // only schema --> error
        Assert.Var<string>(entity, `${STEP.DELETE}: entity is required`)

        await Schema.Delete(<TSchemaRequestDelete>{
            ...$__schemaRequest,
            schema: schema ?? currentSchemaName
        })
    }

    private static async _deletePlan(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
        const { currentDataTable, stepArgs } = step
        const $__schemaRequest = stepArgs as TSchemaRequestDelete
        const { entity } = $__schemaRequest

        // entity given --> error
        Assert.Var<string>(entity, !entity, `${STEP.DELETE}: entity should not be given`)

        const _options: TOptionalParameter = Step._dataProvider.Options.Parse($__schemaRequest, $context)
        const _sqlQueryHelper = Step._dataProvider.GenerateSqlDelete(<TSchemaRequestDelete>{
            entity: currentDataTable.Name
        },
            _options
        )

        return currentDataTable.FreeSql({ sqlQuery: _sqlQueryHelper.Query(), queryParams: _sqlQueryHelper.QueryParams })
    }

    @Logger.LogFunction(true)
    static async ListEntities(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {


        Assert.Var<U_config_plans_plan_entity_list_entities_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_list_entities_Params.safeParse(step.stepArgs).success,
            `${STEP.LIST_ENTITIES}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`)

        const { stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepArgs, new Sandbox($context)) as TSchemaRequestSelect

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        return ($__schemaRequest?.schema)
            ? await Step._listEntitiesSchema(step)
            : await Step._listEntitiesPlan(step, $context)
    }

    private static async _listEntitiesSchema(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

        const { currentSchemaName, stepArgs } = step
        const schemaRequest = stepArgs as TSchemaRequestListEntities
        const { schema } = schemaRequest

        // data from schema
        const _intResp = await Schema.ListEntities(<TSchemaRequestListEntities>{
            ...schemaRequest,
            schema: schema ?? currentSchemaName
        })

        const _isSchemaResponse = Schema.IsSchemaResponse(_intResp.Body)

        if (_intResp.Body && _isSchemaResponse)
            return _intResp.Body.data
        else {
            console.error("Validation debug:", {
                hasBody: !!_intResp.Body,
                body: _intResp.Body,
                isSchemaResponse: _intResp.Body ? Schema.IsSchemaResponse(_intResp.Body) : false,
                dataCount: _intResp.Body && Schema.IsSchemaResponse(_intResp.Body) ? await _intResp.Body.data.Count() : "N/A",
                validationError: _intResp.Body ? z_TSchemaResponse.safeParse(_intResp.Body).error : "No body"
            });
            throw new HttpErrorNotFound(`${STEP.LIST_ENTITIES}: Schema '${schema}' is not valid`)
        }
    }

    private static async _listEntitiesPlan(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

        const { currentDataTable } = step

        const entitiesList: TDataListEntity[] = keys(ConfigManager.Get(`plans.${step.currentPlanName}`))
            .map((entity: string) => (<TDataListEntity>{
                name: entity,
                type: DATA_ENTITY_TYPE.PLAN_ENTITY
            }))

        Logger.Debug(`${STEP.LIST_ENTITIES}: ${JsonUtils.Stringify(step.stepArgs)}`)
        return new DataTable(currentDataTable.Name, entitiesList)
    }

    @Logger.LogFunction()
    static async Join(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<U_config_plans_plan_entity_join_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_join_Params.safeParse(step.stepArgs).success,
            `${STEP.JOIN}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
        )

        const { currentPlanName, currentDataTable, stepArgs } = step

        if (stepArgs === null)
            return currentDataTable

        const $__stepArgs = PlaceHolder.EvaluateJsCode<Record<string, string>>(stepArgs, new Sandbox($context)) as Record<string, string>

        const {
            schema,
            entity,
            type,
            "left-field": leftField,
            "right-field": rightField
        } = $__stepArgs

        // Assert.Var<string>(schema, `${STEP.JOIN}: schema is required`)
        Assert.Var<string>(entity, `${STEP.JOIN}: entity is required`)
        Assert.Var<string>(type, `${STEP.JOIN}: type is required`)
        Assert.Var<string>(leftField, `${STEP.JOIN}: left-field is required`)
        Assert.Var<string>(rightField, `${STEP.JOIN}: right-field is required`)

        const requestToSchema: TStep = {
            ...step,
            currentDataTable: <DataTable>{},
            stepArgs: {
                schema,
                entity
            }
        }

        const requestToCurrentPlan: TSchemaRequest = {
            schema: schema ?? step.currentSchemaName,
            source: currentPlanName,
            entity
        }

        const dtRight = (schema)
            ? await Step.Select(requestToSchema)
            : await Plans.Plans.get(currentPlanName)!.ProcessSchemaRequest(requestToCurrentPlan)

        using _ = dtRight

        return this._joinCaseMap[type]!(step.currentDataTable, dtRight, leftField, rightField) ??
            (Helper.CaseMapNotFound(type) && step.currentDataTable)
    }

    @Logger.LogFunction()
    static async Sort(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<U_config_plans_plan_entity_sort_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_sort_Params.safeParse(step.stepArgs).success,
            `${STEP.SORT}: Wrong argument passed`)

        const params = step.stepArgs as TOrderBy
        const { currentDataTable } = step
        return currentDataTable.Sort(params)
    }

    @Logger.LogFunction()
    static async Debug(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<U_config_plans_plan_entity_debug_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_debug_Params.safeParse(step.stepArgs).success,
            `${STEP.DEBUG}: Wrong argument passed`)

        const debug = step.stepArgs
        step.currentDataTable.MetaDataSet(METADATA.PLAN_DEBUG, debug)

        if (step.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            step.currentDataTable.MetaDataSet(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return step.currentDataTable
    }

    @Logger.LogFunction(true)
    static async Run(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<U_config_plans_plan_entity_run_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_run_Params.safeParse(step.stepArgs).success, `${STEP.RUN}: Wrong argument passed`)

        const DEFAULT = {
            output: null
        }

        $context = merge(
            $context,
            {
                $row: undefined,
                $result: undefined
            }
        )

        const stepArgs = merge(DEFAULT, step.stepArgs) as U_config_plans_plan_entity_run_Params

        const { ai, task, input, output } = stepArgs
        const aiTask = `${ai}-${task}`
        const aiEngine = AiEngine.AiEnginesInstance.get(aiTask)

        Assert.Var<IAiEngine>(aiEngine, aiEngine !== undefined, `${STEP.RUN}: AI Engine ${aiTask} not found`)

        const rowPromises: Promise<void>[] = []

        for (const _row of await step.currentDataTable.Rows({ includeIndex: true })) {
            rowPromises.push((async () => {
                Assert.Var<string>(_row.__idx__, `${STEP.RUN}: Index is not defined`)
                Assert.Condition(_row?.content, `${STEP.RUN}: content is not defined`)

                const __idx__: TUuidv7 = _row.__idx__
                const __row = omitBy(_row, dataTable_fieldIsSystem) as TJson

                $context.$row = __row

                const $__data = RX_JS_CODE.exec(input) === null
                    ? $context.$row[input]
                    : PlaceHolder.EvaluateJsCode(input, new Sandbox($context))

                Assert.Condition($__data !== undefined, `${STEP.RUN}: Input ${input} is not defined`)

                const __result = <Record<string, any>>(
                    await aiEngine.Run({
                        data: $__data,
                        ...step.stepArgs as U_config_plans_plan_entity_run_Params
                    } as TAiArguments)
                )

                if (isEmpty(__result))
                    return

                $context.$result = __result

                switch (true) {
                    case isString(output):
                        __row[output] = __result
                        break

                    case isObject(output):
                        for (const [___outField, ___inField] of Object.entries(output)) {
                            const $__value = RX_JS_CODE.exec(<string>___inField) === null
                                ? __result[___inField as string]
                                : PlaceHolder.EvaluateJsCode(<string>___inField, new Sandbox($context))
                            __row[___outField] = $__value
                        }
                        break

                    case output === undefined || output === null:
                    default:
                        __row[aiTask] = JsonUtils.SafeCopy(__result)
                        break
                }
                await step.currentDataTable.RowUpdateByIndex(__idx__, __row)
            })())
        }

        await Promise.all(rowPromises)
        return step.currentDataTable.FieldsSet()
    }

    @Logger.LogFunction()
    static async Sync(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<U_config_plans_plan_entity_sync_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_sync_Params.safeParse(step.stepArgs).success,
            `${Logger.Out} ${[STEP.SYNC]}: Wrong argument passed`)

        const stepArgs = step.stepArgs

        const $__stepArgs = PlaceHolder.EvaluateJsCode<U_config_plans_plan_entity_sync_Params>(stepArgs, new Sandbox($context)) as U_config_plans_plan_entity_sync_Params

        const { from, to, id } = $__stepArgs

        Assert.Var<string>(id, "'id' must be provided")
        Assert.Condition(from !== undefined || to !== undefined, "Either 'from' and 'to' must be provided")

        const dtSource: DataTable = (from)
            ? (await Step._select(from.schema, from.entity)) ?? new DataTable(from.entity)
            : step.currentDataTable

        const dtDestination: DataTable = (to)
            ? (await Step._select(to.schema, to.entity)) ?? new DataTable(to.entity)
            : step.currentDataTable


        const syncReport = await DataTableUtils.SyncReport({
            source: dtSource,
            destination: dtDestination,
            on: id
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
            await Schema.Insert({
                schema: to.schema,
                entity: to.entity,
                data: syncReport.AddedRows
            })
        }

        // if no destination
        if (!to) {
            await step.currentDataTable.RowsSet([
                ...syncReport.DeletedRows,
                ...syncReport.UpdatedRows,
                ...syncReport.AddedRows
            ])
        }

        return step.currentDataTable.FieldsSet()
    }

    @Logger.LogFunction(true)
    static async Anonymize(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<U_config_plans_plan_entity_anonymize_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_anonymize_Params.safeParse(step.stepArgs).success,
            `${Logger.Out} ${[STEP.ANONYMIZE]}: Wrong argument passed`)
        return DataTableUtils.Anonymize(step.currentDataTable, step.stepArgs)
    }

    @Logger.LogFunction(true)
    static async RemoveDuplicates(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<U_config_plans_plan_entity_remove_duplicates_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_remove_duplicates_Params.safeParse(step.stepArgs).success,
            `${Logger.Out} ${[STEP.REMOVE_DUPLICATE]}: Wrong argument passed`)

        const { keys, method, strategy, condition } = step.stepArgs

        const { currentDataTable } = step

        await DataTableUtils.RemoveDuplicates(currentDataTable, keys, method, strategy, condition)

        Logger.Debug(`${Logger.Out} ${[STEP.REMOVE_DUPLICATE]}: ${JsonUtils.Stringify(step.stepArgs)}`)
        return currentDataTable
    }

    @Logger.LogFunction(true)
    static async Break(step: TStep, _$context?: Partial<TContext>): Promise<undefined> {
        Assert.Var<U_config_plans_plan_entity_break_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_break_Params.safeParse(step.stepArgs).success,
            `${STEP.BREAK}: Wrong argument passed`)
        throw new Error("__BREAK__")
    }

    @Logger.LogFunction()
    static async Pick(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<U_config_plans_plan_entity_pick_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_pick_Params.safeParse(step.stepArgs).success,
            `${STEP.PICK}: Wrong argument passed`)

        const params = step.stepArgs

        if (params.join('') == "*")
            return step.currentDataTable

        if (Array.isArray(params)) {
            return step.currentDataTable.Pick(params)
        } else {
            Assert.Condition(!StringUtils.IsEmpty(params), "Step.Fields: cannot be empty")
            return step.currentDataTable.Pick(StringUtils.Split(params, ","))
        }
    }

    @Logger.LogFunction(true)
    static async Omit(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<U_config_plans_plan_entity_omit_Params>(step.stepArgs,
            z_U_config_plans_plan_entity_omit_Params.safeParse(step.stepArgs).success,
            `${Logger.Out} ${[STEP.OMIT]}: Wrong argument passed`)

        return step.currentDataTable.Omit(step.stepArgs)
    }
}
