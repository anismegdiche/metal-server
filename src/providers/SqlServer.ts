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
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../types/TSchemaResponse"
import { TOptions } from "../types/TOptions"
import { DataTable } from "../types/DataTable"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from '../types/TSchemaRequest'
import { Logger } from '../lib/Logger'
import { Cache } from '../server/Cache'
import { CommonProviderOptionsData } from '../lib/CommonProviderOptionsData'
import { CommonProviderOptionsFilter } from '../lib/CommonProviderOptionsFilter'
import { CommonProviderOptionsFields } from '../lib/CommonProviderOptionsFields'
import { CommonProviderOptionsSort } from '../lib/CommonProviderOptionsSort'


class SqlServerOptions implements IProvider.IProviderOptions {

    Parse(schemaRequest: TSchemaRequest): TOptions {
        let _agg: TOptions = <TOptions>{}
        if (schemaRequest) {
            _agg = this.Filter.Get(_agg, schemaRequest)
            _agg = this.Fields.Get(_agg, schemaRequest)
            _agg = this.Sort.Get(_agg, schemaRequest)
            _agg = this.Data.Get(_agg, schemaRequest)
        }
        return _agg
    }

    public Filter = CommonProviderOptionsFilter

    public Fields = CommonProviderOptionsFields

    public Sort = CommonProviderOptionsSort

    public Data = CommonProviderOptionsData
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

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} SqlServer.Insert: ${JSON.stringify(schemaRequest)}`)

        const _options: TOptions = this.Options.Parse(schemaRequest)

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.INSERT
        }

        const _sqlQuery = new SqlQueryHelper()
            .Insert(`[${schemaRequest.entity}]`.replace(/\./g, "].["))
            .Fields(_options.Data.GetFieldsNames())
            .Values(_options.Data.Rows)
            .Query

        await this.Connection.query(_sqlQuery)
        _schemaResponse = <TSchemaResponseData>{
            ..._schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
        return _schemaResponse
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} SqlServer.Select: ${JSON.stringify(schemaRequest)}`)

        const _options: TOptions = this.Options.Parse(schemaRequest)

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.SELECT
        }

        const _sqlQuery = new SqlQueryHelper()
            .Select(<string>_options.Fields)
            .From(`[${schemaRequest.entity}]`.replace(/\./g, "].["))
            .Where(_options.Filter)
            .OrderBy(<string | undefined>_options.Sort)
            .Query

        const data = await this.Connection.query(_sqlQuery)
        if (data.recordset != null && data.recordset.length > 0) {
            const _dt = new DataTable(schemaRequest.entity, data.recordset)
            Cache.Set(schemaRequest, _dt)
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

    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`SqlServer.Update: ${JSON.stringify(schemaRequest)}`)

        const _options: TOptions = this.Options.Parse(schemaRequest)

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        const _sqlQuery = new SqlQueryHelper()
            .Update(`[${schemaRequest.entity}]`.replace(/\./g, "].["))
            .Set(_options.Data.Rows)
            .Where(_options.Filter)
            .Query

        await this.Connection.query(_sqlQuery)
        _schemaResponse = <TSchemaResponseData>{
            ..._schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
        return _schemaResponse
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`SqlServer.Delete: ${JSON.stringify(schemaRequest)}`)

        const _options: TOptions = this.Options.Parse(schemaRequest)

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.DELETE
        }

        const _sqlQuery = new SqlQueryHelper()
            .Delete()
            .From(`[${schemaRequest.entity}]`.replace(/\./g, "].["))
            .Where(_options.Filter)
            .Query

        await this.Connection.query(_sqlQuery)
        _schemaResponse = <TSchemaResponseData>{
            ..._schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
        return _schemaResponse
    }
}