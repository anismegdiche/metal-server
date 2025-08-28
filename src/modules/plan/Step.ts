//
//
// 
import _ from "lodash"
import typia from "typia"
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
import { DATA_ENTITY } from "../source/@consts"
import { MemoryData } from "../source/providers/MemoryData"
import { TDataListEntity } from "../source/types/TDataListEntity"
import { TOptionalParameter } from "../source/types/TOptionalParameter"
import { STEP } from "./@consts"
import { Plans } from "./Plans"
import { TFunctionStep } from "./types/TFunctionStep"
import { TStepListEntities, TStepRemoveDuplicates, TStepRun, TStepSort, TStepSync } from "./types/TStep"
import { TStepArguments } from "./types/TStepArguments"


//
export class Step {

    static readonly DataProvider = new MemoryData()

    static ExecuteCaseMap: Record<string, TFunctionStep> = { //NOSONAR
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
        [STEP.REMOVE_FIELDS]: Step.RemoveFields
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static JoinCaseMap: Record<string, Function> = { //NOSONAR
        [JOIN_TYPE.LEFT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.LeftJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.RIGHT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.RightJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.INNER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.InnerJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.FULL_OUTER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => dtLeft.FullOuterJoin(dtRight, leftField, rightField),
        [JOIN_TYPE.CROSS]: async (dtLeft: DataTable, dtRight: DataTable) => dtLeft.CrossJoin(dtRight)
    }

    @Logger.LogFunction()
    static async Select(stepArguments: TStepArguments, $context?: Partial<TContext>): Promise<DataTable> {

        if (!typia.is<Partial<TSchemaRequestSelect>>(stepArguments.stepParams))
            throw new HttpErrorInternalServerError(`Step.Select: Wrong argument passed ${JsonUtils.Stringify(stepArguments.stepParams)}`)

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestSelect>(stepParams, new Sandbox($context)) as TSchemaRequestSelect

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            Step.DataProvider.GetContext($__schemaRequest)
        )

        const { schema, entity } = $__schemaRequest

        // FIXME recheck logic for schema=null
        if (entity) {
            const _intResp = await Schema.Select(<TSchemaRequestSelect>{
                ...$__schemaRequest,
                schema: schema ?? currentSchemaName
            })

            if (_intResp.Body && TypeUtils.IsSchemaResponseData(_intResp.Body))
                return _intResp.Body.data
        }

        // case no schema and no entity --> use current datatable
        // FIXME missing options.cache
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

        if (!typia.is<Partial<TSchemaRequestInsert>>(stepArguments.stepParams))
            throw new HttpErrorInternalServerError(`Step.Insert: Wrong argument passed ${JsonUtils.Stringify(stepArguments.stepParams)}`)

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestInsert>(stepParams, new Sandbox($context)) as TSchemaRequestInsert

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(//NOSONAR
            $context,
            Step.DataProvider.GetContext($__schemaRequest)
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

        if (!typia.is<Partial<TSchemaRequestUpdate>>(stepArguments.stepParams))
            throw new HttpErrorInternalServerError(`Step.Update: Wrong argument passed ${JsonUtils.Stringify(stepArguments.stepParams)}`)

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

        if (!typia.is<Partial<TSchemaRequestDelete>>(stepArguments.stepParams))
            throw new HttpErrorInternalServerError(`Step.Delete: Wrong argument passed ${JsonUtils.Stringify(stepArguments.stepParams)}`)

        const { currentSchemaName, currentDataTable, stepParams } = stepArguments

        const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestDelete>(stepParams, new Sandbox($context)) as TSchemaRequestDelete

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            Step.DataProvider.GetContext($__schemaRequest)
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
            : await Plans.Plans.get(currentPlanName)!.ProcessSchemaRequest(requestToCurrentPlan)

        return await this.JoinCaseMap[type](stepArguments.currentDataTable, dtRight, leftField, rightField) ??
            (Helper.CaseMapNotFound(type) && stepArguments.currentDataTable)
    }

    @Logger.LogFunction()
    static async Fields(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        const stepParams: string = stepArguments.stepParams as string
        if (stepParams == "*")
            return stepArguments.currentDataTable

        if (StringUtils.IsEmpty(stepParams))
            throw new HttpErrorInternalServerError("fields: cannot be empty")

        const fields = StringUtils.Split(stepParams, ",")
        return stepArguments.currentDataTable.SelectFields(fields)
    }

    @Logger.LogFunction()
    static async Sort(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        const stepParams = stepArguments.stepParams as TStepSort
        const { currentDataTable } = stepArguments
        return currentDataTable.Sort(stepParams)
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

    @Logger.LogFunction(true)
    static async Run(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {

        const _stepParams = _.merge(
            {
                output: null
            },
            stepArguments.stepParams
        ) as TStepRun

        const { ai, task, input, output } = _stepParams
        const ai_task = `${ai}-${task}`
        const ai_engine = AiEngine.AiEnginesInstance.get(ai_task)

        Assert<IAiEngine>(ai_engine, ai_engine !== undefined, `AI Engine ${ai_task} not found`)

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
                if (_.isNil(output) || _.isEmpty(output)) {
                    stepArguments.currentDataTable.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    stepArguments.currentDataTable.Rows[_rowIndex][ai_task] = JsonUtils.SafeCopy(__result)
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
        const fieldsToAnonymize = StringUtils.Split(stepParams, ",")
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

        Logger.Debug(`${Logger.Out} Step.RemoveDuplicates: ${JsonUtils.Stringify(stepArguments.stepParams)}`)
        return currentDataTable
    }

    @Logger.LogFunction()
    static async ListEntities(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {

        const { currentDataTable, currentPlanName } = stepArguments
        const schemaRequest = stepArguments.stepParams as TStepListEntities

        // schema is defined
        if (schemaRequest?.schema) {
            const _intResp = await Schema.ListEntities(<TSchemaRequest>schemaRequest)

            if (_intResp.Body && TypeUtils.IsSchemaResponseData(_intResp.Body)) {
                Logger.Debug(`${Logger.Out} Step.ListEntities: ${JsonUtils.Stringify(stepArguments.stepParams)}`)
                return _intResp.Body.data
            }
        }

        // no schema passed, return list of plan entities

        const entitiesList: TDataListEntity[] = _
            .keys(ConfigManager.Get(`plans.${currentPlanName}`))
            .map(entity => (<TDataListEntity>{
                name: entity,
                type: DATA_ENTITY.PLAN_ENTITY
            }))
        Logger.Debug(`${Logger.Out} Step.ListEntities: ${JsonUtils.Stringify(stepArguments.stepParams)}`)
        return new DataTable(currentDataTable.Name, entitiesList)
    }

    @Logger.LogFunction()
    static async RemoveFields(stepArguments: TStepArguments, _$context?: Partial<TContext>): Promise<DataTable> {
        Assert<string[]>(stepArguments.stepParams, stepArguments.stepParams instanceof Array, "remove-fields: must be an array")
        return stepArguments.currentDataTable.RemoveFields(stepArguments.stepParams)
    }

    static async #_Select(schema: string, entity: string): Promise<DataTable | undefined> {
        const intResp = await Schema.Select({
            schema,
            entity
        })

        if (intResp.Body && TypeUtils.IsSchemaResponseData(intResp.Body))
            return intResp.Body.data

        return undefined
    }
}
