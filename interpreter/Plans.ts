/* eslint-disable no-continue */
//
//
//
//
//
import { Request } from 'express'
import _ from 'lodash'
import * as Fs from 'fs'
import * as Yaml from 'js-yaml'

import { DataTable, TFields, TOrder, TRows } from '../types/DataTable'
import { Data } from '../server/Data'
import { StringExtend } from '../lib/StringExtend'
import { TJson } from '../types/TJson'
import { TDataResponse, TDataResponseData, TDataResponseNoData } from '../types/TDataResponse'
import { TTransformation } from '../types/TTransformation'
import { Logger } from '../lib/Logger'
import { SqlQueryHelper } from '../lib/Sql'
import { Config } from '../server/Config'
import { HTTP_STATUS_CODE, RESPONSE_RESULT, RESPONSE_STATUS } from '../lib/Const'
import { TInternalResponse } from '../types/TInternalResponse'
import { AiEngine } from '../server/AiEngine'


export abstract class Plans {

    // static async #GetTableSteps(plan: string, entity: string) {
    //     if (Config.Configuration?.plans[plan]?.[entity] ) {
    //         return Config.Configuration?.plans[plan]
    //     }
    //     return undefined
    // }
    static #METADATA = {
        PLAN_DEBUG: '__PLAN_DEBUG__',
        PLAN_ERRORS: '__PLAN_ERRORS__'
    }

    static #GetOptions(transformation: TTransformation) {
        return _.omit(
            transformation,
            ['schema', 'entity']
        )
    }

    // ***************************************************************** //

    static async #Select(plan: string, dt: DataTable, transformation: TTransformation): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Plans.Select: ${JSON.stringify(transformation)}`)

        let _dataResponse: TDataResponse = <TDataResponse>{}

        _dataResponse = await Data.Select(<Request><unknown>{
            params: {
                schema: transformation.schema,
                entity: transformation.entity
            },
            body: this.#GetOptions(transformation)
        })

        dt.Fields = <TFields>{ ...(<TDataResponseData>_dataResponse).data.Fields }
        dt.Rows = <TRows>[...(<TDataResponseData>_dataResponse).data.Rows]

        return dt
    }

    static async #Insert(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Plans.Insert: ${JSON.stringify(transformation)}`)

        const { schema, entity } = transformation

        let _dataResponse: TDataResponse = <TDataResponse>{}

        if (schema && entity) {
            _dataResponse = await Data.Insert(<Request><unknown>{
                params: {
                    schema,
                    entity
                },
                body: this.#GetOptions(transformation)
            })

            dt.Fields = <TFields>{ ...(<TDataResponseData>_dataResponse).data.Fields }
            dt.Rows = <TRows>[...(<TDataResponseData>_dataResponse).data.Rows]

        } else {
            const _dtToInsert = new DataTable("data2insert", transformation?.data)

            const _sqlQuery = new SqlQueryHelper()
                .Insert(dt.Name)
                .Fields(_dtToInsert.GetFieldsNames())
                .Values(_dtToInsert.Rows)
                .Query

            dt.FreeSql(_sqlQuery)
        }
        return dt
    }

    static async #Update(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Plans.Update: ${JSON.stringify(transformation)}`)

        let _dataResponse: TDataResponse = <TDataResponse>{}

        const { schema, entity } = transformation

        if (schema && entity) {
            _dataResponse = await Data.Update(<Request><unknown>{
                params: {
                    schema,
                    entity
                },
                body: this.#GetOptions(transformation)
            })

            dt.Fields = <TFields>{ ...(<TDataResponseData>_dataResponse).data.Fields }
            dt.Rows = <TRows>[...(<TDataResponseData>_dataResponse).data.Rows]

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
        Logger.Debug(`${Logger.In} Plans.Delete: ${JSON.stringify(transformation)}`)

        const { schema, entity } = transformation

        let _dataResponse: TDataResponse = <TDataResponse>{}

        if (schema && entity) {
            _dataResponse = await Data.Delete(<Request><unknown>{
                params: {
                    schema,
                    entity
                },
                body: this.#GetOptions(transformation)
            })

            dt.Fields = <TFields>{ ...(<TDataResponseData>_dataResponse).data.Fields }
            dt.Rows = <TRows>[...(<TDataResponseData>_dataResponse).data.Rows]

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
        Logger.Debug(`${Logger.In} Plans.Join: ${JSON.stringify(transformation)}`)

        const
            _plan = Config.Configuration?.plans[plan],
            _schema = transformation?.schema,
            _entity = transformation?.entity,
            _joinType = transformation?.type,
            _leftFieldName = transformation["left-field"],
            _rightFieldName = transformation["right-field"]

        let _dtRight = new DataTable(_entity)

        if (_schema) {
            _dtRight = await this.#Select(_plan, _dtRight, transformation)
        } else {
            _dtRight = await this.#ExecutePlan(plan, _entity, _plan[_entity])
        }

        return await this.#JoinType[_joinType](dtLeft, _dtRight, _leftFieldName, _rightFieldName)
    }


    static async #Fields(plan: string, dt: DataTable, transformation: string): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Plans.Fields: ${JSON.stringify(transformation)}`)
        const _fields = StringExtend.Split(transformation, ",")
        return dt.SelectFields(_fields)
    }

    static async #Sort(plan: string, dt: DataTable, transformation: TTransformation): Promise<DataTable> {
        Logger.Debug(`${Logger.In} Plans.Sort: ${JSON.stringify(transformation)}`)

        const
            _fields = Object.keys(transformation),
            _orders = Object.values(transformation) as TOrder[]

        return dt.Sort(_fields, _orders)
    }

    static async #Debug(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Plans.Debug: ${JSON.stringify(transformation)}`)
        const _debug: string = transformation || 'error'
        dt.SetMetaData(Plans.#METADATA.PLAN_DEBUG, _debug)
        if (dt.MetaData[Plans.#METADATA.PLAN_ERRORS] == undefined)
            dt.SetMetaData(Plans.#METADATA.PLAN_ERRORS, <TJson[]>[])
        return dt
    }

    // TODO not tested
    static async #AddField(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Plans.AddField: ${JSON.stringify(transformation)}`)
        const { name, type } = transformation
        dt.AddField(name, type)
        return dt
    }

    static async #Run(plan: string, dt: DataTable, transformation: TTransformation) {
        Logger.Debug(`${Logger.In} Plans.Run: ${JSON.stringify(transformation)}`)

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
                for (const [___key, ___value] of Object.entries(output)) {
                    const ____outField = <string>___value
                    const ____inField = <string>___key
                    _rowData[____outField] = __result[____inField]
                }
                dt.Rows[_rowIndex] = _rowData
            }
        }
        return dt.SetFields()
    }

    static #JoinType: Record<string, Function> = {
        'left': async (dtA: DataTable, dtB: DataTable, leftFieldName: string, rightFieldName: string) => dtA.LeftJoin(dtB, leftFieldName, rightFieldName),
        'right': async (dtA: DataTable, dtB: DataTable, leftFieldName: string, rightFieldName: string) => dtA.RightJoin(dtB, leftFieldName, rightFieldName),
        'inner': async (dtA: DataTable, dtB: DataTable, leftFieldName: string, rightFieldName: string) => dtA.InnerJoin(dtB, leftFieldName, rightFieldName),
        'full_outer': async (dtA: DataTable, dtB: DataTable, leftFieldName: string, rightFieldName: string) => dtA.FullOuterJoin(dtB, leftFieldName, rightFieldName),
        'cross': async (dtA: DataTable, dtB: DataTable) => dtA.CrossJoin(dtB)
    }

    static #ExecuteStep: Record<string, Function> = {
        'debug': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#Debug(plan, dt, transformation),
        'select': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#Select(plan, dt, transformation),
        'update': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#Update(plan, dt, transformation),
        'delete': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#Delete(plan, dt, transformation),
        'insert': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#Insert(plan, dt, transformation),
        'join': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#Join(plan, dt, transformation),
        'fields': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#Fields(plan, dt, transformation),
        'sort': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#Sort(plan, dt, transformation),
        'run': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#Run(plan, dt, transformation),
        // TODO not tested
        'add-field': async (plan: string, dt: DataTable, transformation: TTransformation) => await Plans.#AddField(plan, dt, transformation)
    }

    static async #ExecutePlan(plan: string, entity: string, steps: any) {

        let _workingDataTable = new DataTable(entity)

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
                    return _workingDataTable
                }
                _workingDataTable = await this.#ExecuteStep[_command](plan, _workingDataTable, _parameters)

            } catch (error) {
                Logger.Error(`Plan '${plan}', Entity '${entity}': step '${_stepId},${JSON.stringify(transformation)}' is ignored because of error ${JSON.stringify(error)}`)
                if (_workingDataTable.MetaData[Plans.#METADATA.PLAN_DEBUG] == 'error') {
                    /*  
                    FIXME 
                    In case of cross entities, only errors in the final entity are returned.
                    Console log is working fine.
                    */
                   let _error: TJson = {}
                   _error[`entity(${entity}), step(${stepId})`] = _transformation
                   Logger.Debug(`Plan '${plan}', Entity '${entity}': step '${_stepId},${JSON.stringify(transformation)}' added error ${JSON.stringify((<TJson[]>_workingDataTable.MetaData[Plans.#METADATA.PLAN_ERRORS]).push(_error))}`)
                }
            }
        }
        return _workingDataTable
    }

    static async RenderTable(planName: string, entityName: string) {

        let _dataResponse = <TDataResponse>{
            schema: planName,
            entity: entityName,
            transaction: "plan"
        }

        // eslint-disable-next-line no-negated-condition
        if (Config.Configuration?.plans[planName]?.[entityName]) {

            const
                _planConfig = Config.Configuration?.plans[planName],
                _entitySteps = _planConfig[entityName]

            Logger.Debug(`${Logger.In} Plans.Render: ${planName}.${entityName} : ${JSON.stringify(_entitySteps)}`)

            const _workingDataTable = await this.#ExecutePlan(planName, entityName, _entitySteps)

            _dataResponse = <TDataResponseData>{
                ..._dataResponse,
                ...RESPONSE_RESULT.SUCCESS,
                ...RESPONSE_STATUS.HTTP_200,
                data: _workingDataTable
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