//
//
// 
import isEmpty from "lodash/isEmpty"
import isObject from "lodash/isObject"
import isString from "lodash/isString"
import keys from "lodash/keys"
import map from "lodash/map"
import merge from "lodash/merge"
import omit from "lodash/omit"
import omitBy from "lodash/omitBy"
import { is } from "typia"
import { UUID } from "uuidv7"
//
import { DataTable, dataTable_fieldIsSystem, TRow } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { Assert } from "../../utils/Assert"
import { DataTableUtils, JOIN_TYPE } from "../../utils/DataTableUtils"
import { Helper } from "../../utils/Helper"
import { JsonUtils } from "../../utils/JsonUtils"
import { Logger } from "../../utils/Logger"
import { PlaceHolder, RX_JS_CODE } from "../../utils/PlaceHolder"
import { StringUtils } from "../../utils/StringUtils"
import { TypeUtils } from "../../utils/TypeUtils"
import { TAiRunArguments } from "../ai-engine/@types"
import { AiEngine } from "../ai-engine/AiEngine"
import { IAiEngine } from "../ai-engine/base/IAiEngine"
import { METADATA } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../errors/HttpErrors"
import { Sandbox } from "../sandbox/Sandbox"
import { TContext } from "../sandbox/types/TContext"
import { Schema } from "../schema/Schema"
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../schema/types/TSchemaRequest'
import { DATA_ENTITY_TYPE } from "../source/@consts"
import { MemoryData } from "../source/providers/MemoryData"
import { TDataListEntity } from "../source/types/TDataListEntity"
import { TOptionalParameter } from "../source/types/TOptionalParameter"
import { STEP } from "./@consts"
import { Plans } from "./Plans"
import { TStep } from "./types/TStep"
import { TStepArgsAnonymize, TStepArgsDebug, TStepArgsDelete, TStepArgsInsert, TStepArgsJoin, TStepArgsListEntities, TStepArgsOmit, TStepArgsPick, TStepArgsRemoveDuplicates, TStepArgsRun, TStepArgsSelect, TStepArgsSort, TStepArgsSync, TStepArgsUpdate } from "./types/TStepArgs"


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

    static _joinCaseMap: Record<string, TFunctionJoin> = {
        [JOIN_TYPE.LEFT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => DataTableUtils.LeftJoin(dtLeft, dtRight, leftField, rightField),
        [JOIN_TYPE.RIGHT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => DataTableUtils.RightJoin(dtLeft, dtRight, leftField, rightField),
        [JOIN_TYPE.INNER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => DataTableUtils.InnerJoin(dtLeft, dtRight, leftField, rightField),
        [JOIN_TYPE.FULL_OUTER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => DataTableUtils.FullOuterJoin(dtLeft, dtRight, leftField, rightField),
        [JOIN_TYPE.CROSS]: async (dtLeft: DataTable, dtRight: DataTable) => DataTableUtils.CrossJoin(dtLeft, dtRight)
    }

    @Logger.LogFunction()
    static async Select(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsSelect>(step.stepArgs, is<TStepArgsSelect>(step.stepArgs),
            `${Logger.Out} ${STEP.SELECT}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`)

        const { stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepArgs, new Sandbox($context)) as TSchemaRequestSelect

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        return ($__schemaRequest.schema)
            ? await Step._selectSchema(step)
            : await Step._selectPlan(step, $context)
    }

    private static async _selectSchema(step: TStep): Promise<DataTable> {

        const { currentSchemaName, stepArgs } = step
        const schemaRequest = stepArgs as TSchemaRequestSelect
        const { schema, entity } = schemaRequest

        // only schema --> error
        Assert.Var<string>(entity, `${STEP.SELECT}: entity is required`)

        // data from schema
        const _intResp = await Schema.Select(<TSchemaRequestSelect>{
            ...schemaRequest,
            schema: schema ?? currentSchemaName
        })

        if (_intResp.Body && TypeUtils.IsSchemaResponseWithData(_intResp.Body))
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

        if (intResp.Body && TypeUtils.IsSchemaResponseWithData(intResp.Body))
            return intResp.Body.data

        return undefined
    }

    @Logger.LogFunction()
    static async Insert(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsInsert>(step.stepArgs, is<TStepArgsInsert>(step.stepArgs),
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
            data: (data)
                ? data
                : await currentDataTable.Rows()
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

        Assert.Var<TStepArgsUpdate>(step.stepArgs, is<TStepArgsUpdate>(step.stepArgs),
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
            data: (data)
                ? data
                : await currentDataTable.Rows()
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


        Assert.Var<TStepArgsDelete>(step.stepArgs, is<TStepArgsDelete>(step.stepArgs),
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


        Assert.Var<TStepArgsListEntities>(step.stepArgs, is<TStepArgsListEntities>(step.stepArgs),
            `${STEP.LIST_ENTITIES}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`)

        const { stepArgs } = step

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepArgs, new Sandbox($context)) as TSchemaRequestSelect

        $context = merge(
            $context,
            Step._dataProvider.GetContext($__schemaRequest)
        )

        return ($__schemaRequest.schema)
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

        if (_intResp.Body && TypeUtils.IsSchemaResponseWithData(_intResp.Body))
            return _intResp.Body.data
        else
            throw new HttpErrorNotFound(`${STEP.LIST_ENTITIES}: Schema '${schema}' is not valid`)
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

        Assert.Var<TStepArgsJoin>(step.stepArgs, is<TStepArgsJoin>(step.stepArgs),
            `${STEP.JOIN}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`
        )

        const { currentPlanName, currentDataTable, stepArgs } = step

        if (stepArgs === null)
            return currentDataTable

        const $__stepArgs = PlaceHolder.EvaluateJsCode<Record<string, string>>(stepArgs, new Sandbox($context)) as Record<string, string>

        const { schema, entity, type, "left-field": leftField, "right-field": rightField } = $__stepArgs

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

        return this._joinCaseMap[type](step.currentDataTable, dtRight, leftField, rightField) ??
            (Helper.CaseMapNotFound(type) && step.currentDataTable)
    }

    @Logger.LogFunction()
    static async Sort(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepArgsSort>(step.stepArgs, is<TStepArgsSort>(step.stepArgs),
            `${STEP.SORT}: Wrong argument passed`)

        const params = step.stepArgs
        const { currentDataTable } = step
        return currentDataTable.Sort(params)
    }

    @Logger.LogFunction()
    static async Debug(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepArgsDebug>(step.stepArgs, is<TStepArgsDebug>(step.stepArgs),
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

        Assert.Var<TStepArgsRun>(step.stepArgs, is<TStepArgsRun>(step.stepArgs), `${STEP.RUN}: Wrong argument passed`)

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

        const stepArgs = merge(DEFAULT, step.stepArgs) as TStepArgsRun

        const { ai, task, input, output } = stepArgs
        const aiTask = `${ai}-${task}`
        const aiEngine = AiEngine.AiEnginesInstance.get(aiTask)

        Assert.Var<IAiEngine>(aiEngine, aiEngine !== undefined, `${STEP.RUN}: AI Engine ${aiTask} not found`)

        const rowPromises: Promise<void>[] = []

        for await (const _row of await step.currentDataTable.Rows({ includeIndex: true })) {
            rowPromises.push((async () => {
                Assert.Var<string>(_row.__idx__, `${STEP.RUN}: Index is not defined`)
                const __idx__: UUID = _row.__idx__
                const __row = omitBy(_row, dataTable_fieldIsSystem)

                $context.$row = __row

                const $__data = RX_JS_CODE.exec(<string>input) === null
                    ? $context.$row[input]
                    : PlaceHolder.EvaluateJsCode(<string>input, new Sandbox($context))

                Assert.Condition($__data !== undefined, `${STEP.RUN}: Input ${input} is not defined`)

                const __result = <Record<string, any>>(
                    await aiEngine.Run({
                        data: $__data,
                        ...step.stepArgs as TStepArgsRun
                    } as TAiRunArguments)
                )

                if (isEmpty(__result))
                    return

                $context.$result = __result

                switch (true) {
                    default:
                    case output === undefined || output === null:
                        __row[aiTask] = JsonUtils.SafeCopy(__result)
                        break

                    case isString(output):
                        __row[output] = __result
                        break

                    case isObject(output):
                        for (const [___outField, ___inField] of Object.entries(output)) {
                            const $__value = RX_JS_CODE.exec(<string>___inField) === null
                                ? __result[___inField as string]
                                : PlaceHolder.EvaluateJsCode(<string>___inField, new Sandbox($context))
                            __row[___outField as string] = $__value
                        }
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

        Assert.Var<TStepArgsSync>(step.stepArgs, is<TStepArgsSync>(step.stepArgs),
            `${Logger.Out} ${[STEP.SYNC]}: Wrong argument passed`)

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
        Assert.Var<TStepArgsAnonymize>(step.stepArgs, is<TStepArgsAnonymize>(step.stepArgs),
            `${Logger.Out} ${[STEP.ANONYMIZE]}: Wrong argument passed`)
        return DataTableUtils.Anonymize(step.currentDataTable, step.stepArgs)
    }

    @Logger.LogFunction(true)
    static async RemoveDuplicates(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

        Assert.Var<TStepArgsRemoveDuplicates>(step.stepArgs, is<TStepArgsRemoveDuplicates>(step.stepArgs),
            `${Logger.Out} ${[STEP.REMOVE_DUPLICATE]}: Wrong argument passed`)

        const { keys, method, strategy, condition } = step.stepArgs

        const { currentDataTable } = step

        await DataTableUtils.RemoveDuplicates(currentDataTable, keys, method, strategy, condition)

        Logger.Debug(`${Logger.Out} ${[STEP.REMOVE_DUPLICATE]}: ${JsonUtils.Stringify(step.stepArgs)}`)
        return currentDataTable
    }

    @Logger.LogFunction(true)
    static async Break(_step: TStep, _$context?: Partial<TContext>): Promise<undefined> {
        throw new Error("__BREAK__")
    }

    @Logger.LogFunction()
    static async Pick(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TStepArgsPick>(step.stepArgs, is<TStepArgsPick>(step.stepArgs),
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
        Assert.Var<TStepArgsOmit>(step.stepArgs, is<TStepArgsOmit>(step.stepArgs),
            `${Logger.Out} ${[STEP.OMIT]}: Wrong argument passed`)

        return step.currentDataTable.Omit(step.stepArgs)
    }
}
