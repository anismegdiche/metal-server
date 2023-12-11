//
//
//
//
//

import { Pool } from 'pg'

import { RESPONSE_TRANSACTION, RESPONSE } from '../lib/Const'
import * as IProvider from "../types/IProvider"
import { SqlQueryHelper } from '../lib/Sql'
import { TSourceParams } from "../types/TSourceParams"
import { TOptions } from "../types/TOptions"
import { DataTable } from "../types/DataTable"
import { TJson } from "../types/TJson"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from '../types/TSchemaResponse'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { Cache } from '../server/Cache'
import { Logger } from '../lib/Logger'
import { CommonProviderOptionsData } from '../lib/CommonProviderOptionsData'
import { CommonProviderOptionsFilter } from '../lib/CommonProviderOptionsFilter'
import { CommonProviderOptionsFields } from '../lib/CommonProviderOptionsFields'
import { CommonProviderOptionsSort } from '../lib/CommonProviderOptionsSort'


class PostgresOptions implements IProvider.IProviderOptions {

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

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} Postgres.Insert: ${JSON.stringify(schemaRequest)}`)
        const _options: TOptions = this.Options.Parse(schemaRequest)

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.INSERT
        }

        const _sqlQuery = new SqlQueryHelper()
            .Insert(`"${schemaRequest.entity}"`)
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
        Logger.Debug(`Postgres.Select: ${JSON.stringify(schemaRequest)}`)

        const _options: TOptions = this.Options.Parse(schemaRequest)

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.SELECT
        }

        const _sqlQuery = new SqlQueryHelper()
            .Select(<string>_options.Fields)
            .From(`"${schemaRequest.entity}"`)
            .Where(_options.Filter)
            .OrderBy(<string>_options.Sort)
            .Query

        const _data = await this.Connection.query(_sqlQuery)
        if (_data.rows.length > 0) {
            const _dt = new DataTable(schemaRequest.entity, _data.rows)
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
        Logger.Debug(`Postgres.Update: ${JSON.stringify(schemaRequest)}`)

        const _options: TOptions = this.Options.Parse(schemaRequest)

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        const _sqlQuery = new SqlQueryHelper()
            .Update(`"${schemaRequest.entity}"`)
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
        Logger.Debug(`Postgres.Delete : ${JSON.stringify(schemaRequest)}`)

        const _options: TOptions = this.Options.Parse(schemaRequest)

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.DELETE
        }

        const _sqlQuery = new SqlQueryHelper()
            .Delete()
            .From(`"${schemaRequest.entity}"`)
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