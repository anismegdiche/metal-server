/* eslint-disable no-continue */
//
//
//
//
//
import * as Fs from "fs"
import * as Yaml from "js-yaml"
import _ from "lodash"

import { RESPONSE_TRANSACTION, RESPONSE, HTTP_STATUS_CODE, RESPONSE_RESULT, RESPONSE_STATUS } from '../lib/Const'
import * as IProvider from "../types/IProvider"
import { TSourceParams } from "../types/TSourceParams"
import { TOptions } from "../types/TOptions"
import { TJson } from "../types/TJson"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseError, TSchemaResponseNoData } from '../types/TSchemaResponse'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { Cache } from '../server/Cache'
import { Logger } from '../lib/Logger'
import { CommonProviderOptionsData } from '../lib/CommonProviderOptionsData'
import { CommonProviderOptionsFilter } from '../lib/CommonProviderOptionsFilter'
import { CommonProviderOptionsFields } from '../lib/CommonProviderOptionsFields'
import { CommonProviderOptionsSort } from '../lib/CommonProviderOptionsSort'
import { SqlQueryHelper } from '../lib/Sql'
import { StringExtend } from "../lib/StringExtend"
import { AiEngine } from "../server/AiEngine"
import { Config } from "../server/Config"
import { Schema } from "../server/Schema"
import { DataTable, TFields, TOrder, TRows } from "../types/DataTable"
import { TInternalResponse } from "../types/TInternalResponse"
import { TTransformation } from "../types/TTransformation"
import { Helper } from "../lib/Helper"

export const METADATA = {
    PLAN_DEBUG: '__PLAN_DEBUG__',
    PLAN_ERRORS: '__PLAN_ERRORS__'
}

type TStepArguments = {
    schemaName: string,
    planName: string,
    currentDataTable: DataTable,
    transformation: TTransformation
}

class Step {
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

    static JoinTypeCaseMap: Record<string, Function> = {
        'left': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.LeftJoin(dtRight, fieldNameLeft, fieldNameRight),
        'right': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.RightJoin(dtRight, fieldNameLeft, fieldNameRight),
        'inner': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.InnerJoin(dtRight, fieldNameLeft, fieldNameRight),
        'full_outer': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.FullOuterJoin(dtRight, fieldNameLeft, fieldNameRight),
        'cross': async (dtLeft: DataTable, dtRight: DataTable) => dtLeft.CrossJoin(dtRight)
    }

    static async #Select(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Select: ${JSON.stringify(stepArguments.transformation)}`)

        const schemaResponse: TSchemaResponse = await Schema.Select(<TSchemaRequest>stepArguments.transformation)

        stepArguments.currentDataTable.Fields = <TFields>{ ...(<TSchemaResponseData>schemaResponse).data.Fields }
        stepArguments.currentDataTable.Rows = <TRows>[...(<TSchemaResponseData>schemaResponse).data.Rows]

        return stepArguments.currentDataTable
    }

    static async #Insert(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Insert: ${JSON.stringify(stepArguments.transformation)}`)

        const { schema, entity, data } = stepArguments.transformation

        if (schema && !entity) {
            Logger.Warn(`Step.Insert: no entity was provided for schema ${schema}`)
            return stepArguments.currentDataTable
        }

        if (!data && !stepArguments.currentDataTable.Rows.length) {
            Logger.Warn(`Step.Insert: no data to insert`)
            return stepArguments.currentDataTable
        }

        if (schema) {
            let schemaRequest: TSchemaRequest = stepArguments.transformation
            schemaRequest = {
                ...schemaRequest,
                schema: schema ?? stepArguments.schemaName,
                data: (data)
                    ? data
                    : stepArguments.currentDataTable.Rows
            }
            await Schema.Insert(schemaRequest)
        } else {
            const dtToInsert = new DataTable(entity ?? stepArguments.currentDataTable.Name, stepArguments.transformation?.data)
            const sqlQuery = new SqlQueryHelper()
                .Insert(stepArguments.currentDataTable.Name)
                .Fields(dtToInsert.GetFieldsNames())
                .Values(dtToInsert.Rows)
                .Query

            stepArguments.currentDataTable.FreeSql(sqlQuery)
        }

        return stepArguments.currentDataTable
    }

    static async #Update(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Update: ${JSON.stringify(stepArguments.transformation)}`)

        const { schema, entity, data } = stepArguments.transformation

        if (!entity) {
            Logger.Warn(`Step.Insert: no entity was provided`)
            return stepArguments.currentDataTable
        }

        if (!data) {
            Logger.Warn(`Step.Insert: no data to insert`)
            return stepArguments.currentDataTable
        }

        if (schema) {
            await Schema.Update(stepArguments.transformation)

        } else {
            const _filter = stepArguments.transformation['filter-expression'] || [stepArguments.transformation?.filter] || undefined
            const _sqlQuery = new SqlQueryHelper()
                .Update(stepArguments.currentDataTable.Name)
                .Set(data)
                .Where(_filter)
                .Query

            stepArguments.currentDataTable.FreeSql(_sqlQuery)
        }
        return stepArguments.currentDataTable
    }

    static async #Delete(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Delete: ${JSON.stringify(stepArguments.transformation)}`)

        const { schema, entity } = stepArguments.transformation

        if (!entity) {
            Logger.Warn(`Step.Insert: no entity was provided`)
            return stepArguments.currentDataTable
        }

        if (schema) {
            await Schema.Delete(stepArguments.transformation)
        } else {
            const _filter = stepArguments.transformation['filter-expression'] || [stepArguments.transformation?.filter] || undefined
            const _sqlQuery = new SqlQueryHelper()
                .Delete()
                .From(stepArguments.currentDataTable.Name)
                .Where(_filter)
                .Query

            stepArguments.currentDataTable.FreeSql(_sqlQuery)
        }

        return stepArguments.currentDataTable
    }

    static async #Join(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Join: ${JSON.stringify(stepArguments.transformation)}`)

        const { schema, entity, type } = stepArguments.transformation
        const _plan = Config.Configuration?.plans[stepArguments.planName]
        const _fieldNameLeft = stepArguments.transformation["left-field"]
        const _fieldNameRight = stepArguments.transformation["right-field"]

        let dtRight = new DataTable(entity)

        dtRight = (schema)
            ? await this.#Select(
                <TStepArguments>{
                    ...stepArguments,
                    currentDataTable: dtRight
                }
            )
            : await Plans.Execute(stepArguments.schemaName, stepArguments.planName, entity, _plan[entity])

        return await this.JoinTypeCaseMap[type](stepArguments.currentDataTable, dtRight, _fieldNameLeft, _fieldNameRight) ||
            (Helper.CaseMapNotFound(type) && stepArguments.currentDataTable)
    }


    static async #Fields(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Fields: ${JSON.stringify(stepArguments.transformation)}`)
        const _fields = StringExtend.Split(stepArguments.transformation, ",")
        return stepArguments.currentDataTable.SelectFields(_fields)
    }

    static async #Sort(stepArguments: TStepArguments): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Sort: ${JSON.stringify(stepArguments.transformation)}`)

        const fields = Object.keys(stepArguments.transformation)
        const orders: TOrder[] = Object.values(stepArguments.transformation)

        return stepArguments.currentDataTable.Sort(fields, orders)
    }

    static async #Debug(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Debug: ${JSON.stringify(stepArguments.transformation)}`)
        const _debug: string = stepArguments.transformation || 'error'
        stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_DEBUG, _debug)

        if (stepArguments.currentDataTable.MetaData[METADATA.PLAN_ERRORS] == undefined) {
            stepArguments.currentDataTable.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        }

        return stepArguments.currentDataTable
    }

    // TODO not tested
    static async #AddField(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.AddField: ${JSON.stringify(stepArguments.transformation)}`)
        const { name, type } = stepArguments.transformation
        stepArguments.currentDataTable.AddField(name, type)
        return stepArguments.currentDataTable
    }

    static async #Run(stepArguments: TStepArguments) {
        Logger.Debug(`${Logger.In} Step.Run: ${JSON.stringify(stepArguments.transformation)}`)

        const { ai, input, output } = stepArguments.transformation

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

export class Plans {
    static async Execute(schemaName: string | undefined, plan: string, entity: string, steps: any) {

        let dtWorking = new DataTable(entity)

        for await (const [stepId, transformation] of Object.entries(steps)) {
            const _stepId = parseInt(stepId, 10) + 1
            const _transformation = <TJson>transformation

            Logger.Debug(`Plan '${plan}': '${_stepId}',  ${JSON.stringify(_transformation)}`)

            try {
                const _command: string = Object.keys(_transformation)[0]
                const _parameters: TJson = <TJson>_transformation[_command]

                if (_command == 'break') {
                    Logger.Info(`Plan '${plan}': user break at step '${_stepId}',${JSON.stringify(_transformation)}`)
                    return dtWorking
                }
                dtWorking = await Step.ExecuteCaseMap[_command](schemaName, plan, dtWorking, _parameters) ||
                    Helper.CaseMapNotFound(_command)

            } catch (error: unknown) {
                const _error = <Error>error
                Logger.Error(`Plan '${plan}', Entity '${entity}': step '${_stepId},${JSON.stringify(transformation)}' is ignored because of error ${JSON.stringify(_error?.message)}`)
                if (dtWorking.MetaData[METADATA.PLAN_DEBUG] == 'error') {
                    /*
                    FIXME
                    In case of cross entities, only errors in the final entity are returned.
                    Console log is working fine.
                    */
                    const _PlanErrors: TJson = {}
                    _PlanErrors[`entity(${entity}), step(${stepId})`] = _transformation
                    Logger.Debug(`Plan '${plan}', Entity '${entity}': step '${_stepId},${JSON.stringify(transformation)}' added error ${JSON.stringify((<TJson[]>dtWorking.MetaData[METADATA.PLAN_ERRORS]).push(_PlanErrors))}`)
                }
            }
        }
        return dtWorking
    }

    static async GetData(schemaName: string | undefined, planName: string, entityName: string, sqlQuery: string | undefined = undefined) {

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaName,
            entity: entityName,
            transaction: "plan"
        }

        // eslint-disable-next-line no-negated-condition
        if (Config.Configuration?.plans[planName]?.[entityName]) {

            const _planConfig = Config.Configuration?.plans[planName]
            const _entitySteps = _planConfig[entityName]

            Logger.Debug(`${Logger.In} Plans.GetData: ${planName}.${entityName} : ${JSON.stringify(_entitySteps)}`)

            const dtWorking = await this.Execute(schemaName, planName, entityName, _entitySteps)

            if (sqlQuery !== undefined) {
                dtWorking.FreeSql(sqlQuery)
            }

            _schemaResponse = <TSchemaResponseData>{
                ..._schemaResponse,
                ...RESPONSE_RESULT.SUCCESS,
                ...RESPONSE_STATUS.HTTP_200,
                data: dtWorking
            }

        } else {
            _schemaResponse = <TSchemaResponseNoData>{
                ..._schemaResponse,
                ...RESPONSE_RESULT.NOT_FOUND,
                ...RESPONSE_STATUS.HTTP_404
            }
        }
        return _schemaResponse
    }

    static Reload(plan: string): TInternalResponse {
        Logger.Debug(`${Logger.In} Plans.Reload`)
        const _configFileRaw = Fs.readFileSync(Config.ConfigFilePath, 'utf-8')
        const _configFileJson: any = Yaml.load(_configFileRaw)
        // check if plan exist
        if (_.has(Config.Configuration.plans, plan) &&
            _.has(_configFileJson.plans, plan)) {
            Config.Configuration.plans[plan] = _configFileJson.plans[plan]
            return <TInternalResponse>{
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: {
                    plan,
                    message: `Plan reloaded`
                }
            }
        }
        // plan not found
        return <TInternalResponse>{
            StatusCode: HTTP_STATUS_CODE.NOT_FOUND,
            Body: {
                plan,
                message: `Plan not found`
            }
        }
    }
}


class PlanOptions implements IProvider.IProviderOptions {

    Parse(schemaRequest: TSchemaRequest): TOptions {
        let options: TOptions = <TOptions>{}
        if (schemaRequest) {
            options = this.Filter.Get(options, schemaRequest)
            options = this.Fields.Get(options, schemaRequest)
            options = this.Sort.Get(options, schemaRequest)
            options = this.Data.Get(options, schemaRequest)
        }
        return options
    }

    public Filter = CommonProviderOptionsFilter

    public Fields = CommonProviderOptionsFields

    public Sort = CommonProviderOptionsSort

    //TODO: unused
    public Data = CommonProviderOptionsData
}

export class Plan implements IProvider.IProvider {
    public ProviderName = 'Plan'
    public SourceName: string
    public Params: TSourceParams = <TSourceParams>{}
    public Config: TJson = {}

    Options = new PlanOptions()

    constructor(sourceName: string, oParams: TJson) {
        this.SourceName = sourceName
        this.Init(<TSourceParams>oParams)
        this.Connect()
    }

    async Init(oParams: TSourceParams) {
        Logger.Debug("Plan.Init")
        this.Params = oParams
    }

    async Connect(): Promise<void> {
        Logger.Info(`${Logger.In} connected to '${this.SourceName} (${this.Params.database})'`)
    }

    // eslint-disable-next-line class-methods-use-this
    async Disconnect(): Promise<void> {
        return undefined
    }

    // eslint-disable-next-line class-methods-use-this
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} Plan.Insert: ${JSON.stringify(schemaRequest)}`)
        const { schema, entity } = schemaRequest
        Logger.Error(`Schema.Insert: Not allowed for plans '${schema}', entity '${entity}'`)
        return <TSchemaResponseError>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.INSERT,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Plan.Select: ${JSON.stringify(schemaRequest)}`)

        const _options: TOptions = this.Options.Parse(schemaRequest)
        const { schema, entity } = schemaRequest

        let _schemaResponse = <TSchemaResponse>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.SELECT
        }

        // eslint-disable-next-line init-declarations
        let _sqlQuery: string | undefined

        if (_options.Fields || _options.Filter || _options.Sort) {
            _sqlQuery = new SqlQueryHelper()
                .Select(<string>_options.Fields)
                .From(entity)
                .Where(_options.Filter)
                .OrderBy(<string | undefined>_options.Sort)
                .Query
        }

        const _planSchemaResponse = await Plans.GetData(
            schema,
            this.Params.database as string,
            entity,
            _sqlQuery
        )

        if ((<TSchemaResponseData>_planSchemaResponse).data.Rows.length > 0) {
            const _dt = (<TSchemaResponseData>_planSchemaResponse).data
            Cache.Set({
                ...schemaRequest,
                source: this.SourceName
            }, _dt)
            _schemaResponse = <TSchemaResponseData>{
                ..._schemaResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: _dt
            }
        } else {
            _schemaResponse = <TSchemaResponseNoData>{
                ..._schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        return _schemaResponse
    }

    // eslint-disable-next-line class-methods-use-this
    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Plan.Update: ${JSON.stringify(schemaRequest)}`)
        const { schema, entity } = schemaRequest
        Logger.Error(`Schema.Update: Not allowed for plans '${schema}', entity '${entity}'`)
        return <TSchemaResponseError>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.UPDATE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Plan.Delete : ${JSON.stringify(schemaRequest)}`)
        const { schema, entity } = schemaRequest
        Logger.Error(`Schema.Delete: Not allowed for plans '${schema}', entity '${entity}'`)
        return <TSchemaResponseError>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.DELETE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }
}


