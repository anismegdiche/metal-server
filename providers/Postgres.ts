//
//
//
//
//

import { Pool } from 'pg'

import { RESPONSE_TRANSACTION, RESPONSE } from '../lib/Const'
import * as IProvider from "../types/IProvider"
import { SqlQueryHelper } from '../lib/Sql'
import { Convert } from '../lib/Convert'
import { TSourceParams } from "../types/TSourceParams"
import { TOptions } from "../types/TOptions"
import { DataTable } from "../types/DataTable"
import { TJson } from "../types/TJson"
import { TDataResponse, TDataResponseData, TDataResponseNoData } from '../types/TDataResponse'
import { TDataRequest } from '../types/TDataRequest'
import { Cache } from '../server/Cache'
import { Logger } from '../lib/Logger'
import { CommonProviderOptionsData } from '../lib/CommonProviderOptionsData'


class PostgresOptions implements IProvider.IProviderOptions {

    Parse(dataRequest: TDataRequest): TOptions {
        let _agg: TOptions = <TOptions>{}
        if (dataRequest) {
            _agg = this.Filter.Get(_agg, dataRequest)
            _agg = this.Fields.Get(_agg, dataRequest)
            _agg = this.Sort.Get(_agg, dataRequest)
            _agg = this.Data.Get(_agg, dataRequest)
        }
        return _agg
    }

    Filter = class {
        static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
            let _filter = {}
            if (dataRequest['filter-expression']  || dataRequest?.filter) {

                if (dataRequest['filter-expression'])
                    _filter = this.GetExpression(dataRequest['filter-expression'])

                if (dataRequest?.filter)
                    _filter = Convert.JsonToArray(dataRequest.filter)

                agg.Filter = _filter
            }
            return agg
        }

        static GetExpression(filterExpression: string): string {
            return Convert.OptionsFilterExpressionToSql(filterExpression)
        }
    }

    Fields = class {
        static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
            if (dataRequest?.fields === undefined)
                agg.Fields = '*'
            else
                agg.Fields = dataRequest.fields

            return agg
        }
    }

    Sort = class {
        static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
            if (dataRequest?.sort) {
                agg.Sort = dataRequest.sort
            }
            return agg
        }
    }

    public Data = CommonProviderOptionsData
}

export class Postgres implements IProvider.IProvider {
    public ProviderName = 'postgres'
    public SourceName: string
    public Params: TSourceParams = <TSourceParams>{}
    public Primitive = Pool
    public Connection: Pool = <Pool>{}
    public Config: TJson = {}

    Options = new PostgresOptions()

    constructor(sourceName: string, oParams: TJson) {
        this.SourceName = sourceName
        this.Init(<TSourceParams>oParams)
        this.Connect()
    }

    async Init(oParams: TSourceParams) {
        Logger.Debug("Postgres.Init")
        this.Params = oParams
    }

    async Connect(): Promise<void> {
        const _sourceName = this.SourceName
        const { user = '', password = '', database = 'postgres', host = '', port = 5432 } = this.Params || {}
        try {
            this.Connection = new this.Primitive({
                user,
                password,
                database,
                host,
                port
            })
            this.Connection.query('SELECT NOW()', async function (err) {
                try {
                    if (err)
                        throw err
                    else
                        Logger.Info(`${Logger.In} connected to '${_sourceName} (${database})'`)

                } catch (error: unknown) {
                    Logger.Error(`${Logger.In} Failed to connect to '${_sourceName} (${database})'`)
                    Logger.Error(error)
                }
            })
        } catch (error: unknown) {
            Logger.Error(`${Logger.In} Failed to connect to '${_sourceName} (${database})'`)
            Logger.Error(error)
        }
    }

    async Disconnect(): Promise<void> {
        this.Connection.end()
    }

    async Insert(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`${Logger.Out} Postgres.Insert: ${JSON.stringify(dataRequest)}`)
        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.INSERT
        }

        const _sqlQuery = new SqlQueryHelper()
            .Insert(`"${dataRequest.entity}"`)
            .Fields(_options.Data.GetFieldsNames())
            .Values(_options.Data.Rows)
            .Query

        await this.Connection.query(_sqlQuery)
        _dataResponse = <TDataResponseData>{
            ..._dataResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
        return _dataResponse
    }

    async Select(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`Postgres.Select : ${JSON.stringify(dataRequest)}`)

        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.SELECT
        }

        const _sqlQuery = new SqlQueryHelper()
            .Select(<string>_options.Fields)
            .From(`"${dataRequest.entity}"`)
            .Where(_options.Filter)
            .OrderBy(<string>_options.Sort)
            .Query

        const _data = await this.Connection.query(_sqlQuery)
        if (_data.rows.length > 0) {
            const _dt = new DataTable(dataRequest.entity, _data.rows)
            Cache.Set(dataRequest, _dt)
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

    async Update(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`Postgres.Update: ${JSON.stringify(dataRequest)}`)

        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        const _sqlQuery = new SqlQueryHelper()
            .Update(`"${dataRequest.entity}"`)
            .Set(_options.Data.Rows)
            .Where(_options.Filter)
            .Query

        await this.Connection.query(_sqlQuery)
        _dataResponse = <TDataResponseData>{
            ..._dataResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
        return _dataResponse
    }

    async Delete(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`Postgres.Delete : ${JSON.stringify(dataRequest)}`)

        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.DELETE
        }

        const _sqlQuery = new SqlQueryHelper()
            .Delete()
            .From(`"${dataRequest.entity}"`)
            .Where(_options.Filter)
            .Query

        await this.Connection.query(_sqlQuery)
        _dataResponse = <TDataResponseData>{
            ..._dataResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
        return _dataResponse
    }
}