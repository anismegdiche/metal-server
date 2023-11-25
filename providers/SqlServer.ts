//
//
//
//
//
import mssql from 'mssql'

import { RESPONSE_TRANSACTION, RESPONSE } from '../lib/Const'
import * as IProvider from "../types/IProvider"
import { SqlQueryHelper } from '../lib/Sql'
import { TSourceParams } from "../types/TSourceParams"
import { TDataResponse, TDataResponseData, TDataResponseNoData } from "../types/TDataResponse"
import { TOptions } from "../types/TOptions"
import { Convert } from "../lib/Convert"
import { DataTable } from "../types/DataTable"
import { TJson } from "../types/TJson"
import { TDataRequest } from '../types/TDataRequest'
import { Logger } from '../lib/Logger'
import { Cache } from '../server/Cache'


class SqlServerOptions implements IProvider.IProviderOptions {

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

        static GetExpression(filterExpression: string) {
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

    Data = class {
        static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
            if (dataRequest?.data) {
                agg.Data = new DataTable(dataRequest.entity, dataRequest.data)
            }
            return agg
        }
    }
}

export class SqlServer implements IProvider.IProvider {
    public ProviderName = 'sqlserver'
    public SourceName: string
    public Params: TSourceParams = <TSourceParams>{}
    public Primitive = mssql
    public Connection: any = {}
    public Config: TJson = {}

    Options: SqlServerOptions = new SqlServerOptions()

    constructor(sourceName: string, oParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(oParams)
        this.Connect()
    }

    async Init(oParams: TSourceParams) {
        Logger.Debug("SqlServer.Init")
        this.Params = oParams        
    }

    async Connect(): Promise<void> {
        Logger.Debug("SqlServer.Connect")
        const { user = '', password = '', database = '', host = '', port = 1433 } = this.Params || {}
        const _connectionConfig = {
            user,
            password,
            database,
            server: host,
            port,
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            },
            options: {
                encrypt: false, // true for azure
                trustServerCertificate: true // change to true for local dev / self-signed certs
            }
        }
        try {
            this.Connection = await this.Primitive.connect(_connectionConfig)
            Logger.Info(`${Logger.In} connected to '${this.SourceName} (${database})'`)
        } catch (error: unknown) {
            Logger.Error(`${Logger.In} Failed to connect to '${this.SourceName} (${database})': ${host}: ${port}[${database}]`)
            Logger.Error(JSON.stringify(error))
        }
    }

    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.In} SqlServer.Disconnect`)
        this.Connection.close()
    }

    async Insert(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`${Logger.Out} SqlServer.Insert: ${JSON.stringify(dataRequest)}`)

        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.INSERT
        }

        const _sqlQuery = new SqlQueryHelper()
            .Insert(`[${dataRequest.entity}]`.replace(/\./g, "].["))
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
        Logger.Debug(`${Logger.Out} SqlServer.Select: ${JSON.stringify(dataRequest)}`)

        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.SELECT
        }

        const _sqlQuery = new SqlQueryHelper()
            .Select(<string>_options.Fields)
            .From(`[${dataRequest.entity}]`.replace(/\./g, "].["))
            .Where(_options.Filter)
            .OrderBy(<string | undefined>_options.Sort)
            .Query

        const data = await this.Connection.query(_sqlQuery)
        if (data.recordset != null && data.recordset.length > 0) {
            const _dt = new DataTable(dataRequest.entity, data.recordset)
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
        Logger.Debug(`SqlServer.Update: ${JSON.stringify(dataRequest)}`)

        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        const _sqlQuery = new SqlQueryHelper()
            .Update(`[${dataRequest.entity}]`.replace(/\./g, "].["))
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
        Logger.Debug(`SqlServer.Delete: ${JSON.stringify(dataRequest)}`)

        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.DELETE
        }

        const _sqlQuery = new SqlQueryHelper()
            .Delete()
            .From(`[${dataRequest.entity}]`.replace(/\./g, "].["))
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