/* eslint-disable no-continue */
//
//
//
//
//
import { Request } from "express"
import * as Fs from "fs"
import * as Yaml from "js-yaml"
import _ from "lodash"

import { RESPONSE_TRANSACTION, RESPONSE, HTTP_STATUS_CODE, RESPONSE_RESULT, RESPONSE_STATUS } from '../lib/Const'
import * as IProvider from "../types/IProvider"
import { TSourceParams } from "../types/TSourceParams"
import { TOptions } from "../types/TOptions"
import { TJson } from "../types/TJson"
import { TDataResponse, TDataResponseData, TDataResponseError, TDataResponseNoData } from '../types/TDataResponse'
import { TDataRequest } from '../types/TDataRequest'
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
import { Schema } from "../interpreter/Schema"
import { DataTable, TFields, TOrder, TRows } from "../types/DataTable"
import { TInternalResponse } from "../types/TInternalResponse"
import { TTransformation } from "../types/TTransformation"
import { Helper } from "../lib/Helper"

export const METADATA = {
    PLAN_DEBUG: '__PLAN_DEBUG__',
    PLAN_ERRORS: '__PLAN_ERRORS__'
}

class Step {
    static ExecuteCaseMap: Record<string, Function> = {
        'debug': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#Debug(plan, dt, transformation),
        'select': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#Select(plan, dt, transformation),
        'update': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#Update(plan, dt, transformation),
        'delete': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#Delete(plan, dt, transformation),
        'insert': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#Insert(plan, dt, transformation),
        'join': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#Join(plan, dt, transformation),
        'fields': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#Fields(plan, dt, transformation),
        'sort': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#Sort(plan, dt, transformation),
        'run': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#Run(plan, dt, transformation),
        // TODO not tested
        'add-field': async (plan: string, dt: DataTable, transformation: TTransformation) => await Step.#AddField(plan, dt, transformation)
    }

    static JoinTypeCaseMap: Record<string, Function> = {
        'left': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.LeftJoin(dtRight, fieldNameLeft, fieldNameRight),
        'right': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.RightJoin(dtRight, fieldNameLeft, fieldNameRight),
        'inner': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.InnerJoin(dtRight, fieldNameLeft, fieldNameRight),
        'full_outer': async (dtLeft: DataTable, dtRight: DataTable, fieldNameLeft: string, fieldNameRight: string) => dtLeft.FullOuterJoin(dtRight, fieldNameLeft, fieldNameRight),
        'cross': async (dtLeft: DataTable, dtRight: DataTable) => dtLeft.CrossJoin(dtRight)
    }

    static GetPlanOptions(transformation: TTransformation) {
        return _.omit(
            transformation,
            ['schema', 'entity']
        )
    }

    static async #Select(plan: string, dt: DataTable, transformation: TTransformation): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Select: ${JSON.stringify(transformation)}`)

        let dataResponse: TDataResponse = <TDataResponse>{}

        dataResponse = await Schema.Select(<Request><unknown>{
            params: {
                schema: transformation.schema,
                entity: transformation.entity
            },
            body: Step.GetPlanOptions(transformation)
        })

        dt.Fields = <TFields>{ ...(<TDataResponseData>dataResponse).data.Fields }
        dt.Rows = <TRows>[...(<TDataResponseData>dataResponse).data.Rows]

        return dt
    }

    static async #Insert(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Step.Insert: ${JSON.stringify(transformation)}`)

        const { schema, entity } = transformation

        let body: TJson = {}

        if (schema && entity) {
            if (transformation.data || dt.Rows.length > 0) {
                body = Step.GetPlanOptions(transformation)
                if (dt.Rows.length > 0) {
                    body = {
                        ...body,
                        data: dt.Rows
                    }
                }
            } else {
                Logger.Warn(`Step.Insert: no data to insert`)
                return dt
            }
            await Schema.Insert(<Request><unknown>{
                params: {
                    schema,
                    entity
                },
                body
            })
        } else {
            const dtToInsert = new DataTable(entity ?? "data2insert", transformation?.data)

            const sqlQuery = new SqlQueryHelper()
                .Insert(dt.Name)
                .Fields(dtToInsert.GetFieldsNames())
                .Values(dtToInsert.Rows)
                .Query

            dt.FreeSql(sqlQuery)
        }
        return dt
    }

    static async #Update(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Step.Update: ${JSON.stringify(transformation)}`)

        const { schema, entity } = transformation

        if (schema && entity) {
            await Schema.Update(<Request><unknown>{
                params: {
                    schema,
                    entity
                },
                body: Step.GetPlanOptions(transformation)
            })

        } else {
            const
                _data: TJson = transformation?.data,
                _filter = transformation['filter-expression'] || [transformation?.filter] || undefined

            const _sqlQuery = new SqlQueryHelper()
                .Update(dt.Name)
                .Set(_data)
                .Where(_filter)
                .Query

            dt.FreeSql(_sqlQuery)
        }
        return dt
    }

    static async #Delete(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Step.Delete: ${JSON.stringify(transformation)}`)

        const { schema, entity } = transformation

        if (schema && entity) {
            await Schema.Delete(<Request><unknown>{
                params: {
                    schema,
                    entity
                },
                body: Step.GetPlanOptions(transformation)
            })
        } else {
            const _filter = transformation['filter-expression'] || [transformation?.filter] || undefined
            const _sqlQuery = new SqlQueryHelper()
                .Delete()
                .From(dt.Name)
                .Where(_filter)
                .Query

            dt.FreeSql(_sqlQuery)
        }

        return dt
    }

    static async #Join(plan: string, dtLeft: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Step.Join: ${JSON.stringify(transformation)}`)

        const
            _plan = Config.Configuration?.plans[plan],
            _schema = transformation?.schema,
            _entity = transformation?.entity,
            _joinType = transformation?.type,
            _fieldNameLeft = transformation["left-field"],
            _fieldNameRight = transformation["right-field"]

        let _dtRight = new DataTable(_entity)

        if (_schema) {
            _dtRight = await this.#Select(_plan, _dtRight, transformation)
        } else {
            _dtRight = await Plans.Execute(plan, _entity, _plan[_entity])
        }

        return await this.JoinTypeCaseMap[_joinType](dtLeft, _dtRight, _fieldNameLeft, _fieldNameRight) || 
            Helper.CaseMapNotFound(_joinType)
    }


    static async #Fields(plan: string, dt: DataTable, transformation: string): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Fields: ${JSON.stringify(transformation)}`)
        const _fields = StringExtend.Split(transformation, ",")
        return dt.SelectFields(_fields)
    }

    static async #Sort(plan: string, dt: DataTable, transformation: TTransformation): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Step.Sort: ${JSON.stringify(transformation)}`)

        const
            _fields = Object.keys(transformation),
            _orders: TOrder[] = Object.values(transformation)

        return dt.Sort(_fields, _orders)
    }

    static async #Debug(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Step.Debug: ${JSON.stringify(transformation)}`)
        const _debug: string = transformation || 'error'
        dt.SetMetaData(METADATA.PLAN_DEBUG, _debug)
        if (dt.MetaData[METADATA.PLAN_ERRORS] == undefined)
            dt.SetMetaData(METADATA.PLAN_ERRORS, <TJson[]>[])
        return dt
    }

    // TODO not tested
    static async #AddField(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Step.AddField: ${JSON.stringify(transformation)}`)
        const { name, type } = transformation
        dt.AddField(name, type)
        return dt
    }

    static async #Run(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Step.Run: ${JSON.stringify(transformation)}`)

        const { ai, input, output } = transformation

        for await (const [_rowIndex, _rowData] of dt.Rows.entries()) {
            const __result = <Record<string, any>>(await AiEngine.Engine[ai].Run(<string>_rowData[input]))
            if (__result) {
                // check if output is empty
                if (_.isNil(output) || _.isEmpty(output)) {
                    dt.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    dt.Rows[_rowIndex][ai] = __result
                    continue
                }

                // check if output is string
                if (_.isString(output)) {
                    dt.Rows[_rowIndex] = {
                        ..._rowData
                    }
                    dt.Rows[_rowIndex][output] = __result
                    continue
                }

                // else                
                for (const [___inField, ___outField] of Object.entries(output)) {
                    _rowData[___outField as string] = __result[___inField]
                }
                dt.Rows[_rowIndex] = _rowData
            }
        }
        return dt.SetFields()
    }

}

export class Plans {
    static async Execute(plan: string, entity: string, steps: any) {

        let dtWorking = new DataTable(entity)

        for await (const [stepId, transformation] of Object.entries(steps)) {
            const
                _stepId = parseInt(stepId, 10) + 1,
                _transformation = <TJson>transformation

            Logger.Debug(`Plan '${plan}': '${_stepId}',  ${JSON.stringify(_transformation)}`)

            try {
                const _command: string = Object.keys(_transformation)[0]
                const _parameters: TJson = <TJson>_transformation[_command]

                if (_command == 'break') {
                    Logger.Info(`Plan '${plan}': user break at step '${_stepId}',${JSON.stringify(_transformation)}`)
                    return dtWorking
                }
                dtWorking = await Step.ExecuteCaseMap[_command](plan, dtWorking, _parameters) || 
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
                    let _PlanErrors: TJson = {}
                    _PlanErrors[`entity(${entity}), step(${stepId})`] = _transformation
                    Logger.Debug(`Plan '${plan}', Entity '${entity}': step '${_stepId},${JSON.stringify(transformation)}' added error ${JSON.stringify((<TJson[]>dtWorking.MetaData[METADATA.PLAN_ERRORS]).push(_PlanErrors))}`)
                }
            }
        }
        return dtWorking
    }

    static async GetData(schemaName: string | undefined, planName: string, entityName: string, sqlQuery: string | undefined = undefined) {

        let _dataResponse = <TDataResponse>{
            schema: schemaName,
            entity: entityName,
            transaction: "plan"
        }

        // eslint-disable-next-line no-negated-condition
        if (Config.Configuration?.plans[planName]?.[entityName]) {

            const
                _planConfig = Config.Configuration?.plans[planName],
                _entitySteps = _planConfig[entityName]

            Logger.Debug(`${Logger.In} Plans.GetData: ${planName}.${entityName} : ${JSON.stringify(_entitySteps)}`)

            const dtWorking = await this.Execute(planName, entityName, _entitySteps)

            if (sqlQuery !== undefined) {
                dtWorking.FreeSql(sqlQuery)
            }

            _dataResponse = <TDataResponseData>{
                ..._dataResponse,
                ...RESPONSE_RESULT.SUCCESS,
                ...RESPONSE_STATUS.HTTP_200,
                data: dtWorking
            }

        } else {
            _dataResponse = <TDataResponseNoData>{
                ..._dataResponse,
                ...RESPONSE_RESULT.NOT_FOUND,
                ...RESPONSE_STATUS.HTTP_404
            }
        }
        return _dataResponse
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

    Parse(dataRequest: TDataRequest): TOptions {
        let options: TOptions = <TOptions>{}
        if (dataRequest) {
            options = this.Filter.Get(options, dataRequest)
            options = this.Fields.Get(options, dataRequest)
            options = this.Sort.Get(options, dataRequest)
            options = this.Data.Get(options, dataRequest)
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
    async Insert(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`${Logger.Out} Plan.Insert: ${JSON.stringify(dataRequest)}`)
        const { schema, entity } = dataRequest
        Logger.Error(`Schema.Insert: Not allowed for plans '${schema}', entity '${entity}'`)
        return <TDataResponseError>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.INSERT,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

    async Select(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`Plan.Select: ${JSON.stringify(dataRequest)}`)

        const _options: TOptions = this.Options.Parse(dataRequest)
        const { schema, entity } = dataRequest

        let _dataResponse = <TDataResponse>{
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

        const _planDataResponse = await Plans.GetData(
            schema,
            this.Params.database as string,
            entity,
            _sqlQuery
        )

        if ((<TDataResponseData>_planDataResponse).data.Rows.length > 0) {
            const _dt = (<TDataResponseData>_planDataResponse).data
            Cache.Set({
                ...dataRequest,
                source: this.SourceName
            }, _dt)
            _dataResponse = <TDataResponseData>{
                ..._dataResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: _dt
            }
        } else {
            _dataResponse = <TDataResponseNoData>{
                ..._dataResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        return _dataResponse
    }

    // eslint-disable-next-line class-methods-use-this
    async Update(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`Plan.Update: ${JSON.stringify(dataRequest)}`)
        const { schema, entity } = dataRequest
        Logger.Error(`Schema.Update: Not allowed for plans '${schema}', entity '${entity}'`)
        return <TDataResponseError>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.UPDATE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Delete(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`Plan.Delete : ${JSON.stringify(dataRequest)}`)
        const { schema, entity } = dataRequest
        Logger.Error(`Schema.Delete: Not allowed for plans '${schema}', entity '${entity}'`)
        return <TDataResponseError>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.DELETE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }
}


