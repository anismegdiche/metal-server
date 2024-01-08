//
//
//
//
//

import { Pool } from 'pg'

import { RESPONSE_TRANSACTION, RESPONSE } from '../lib/Const'
import * as IProvider from "../types/IProvider"
import { SqlQueryHelper } from '../lib/SqlQueryHelper'
import { TSourceParams } from "../types/TSourceParams"
import { TOptions } from "../types/TOptions"
import { DataTable } from "../types/DataTable"
import { TJson } from "../types/TJson"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from '../types/TSchemaResponse'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { Cache } from '../server/Cache'
import { Logger } from '../lib/Logger'
import { CommonSqlProviderOptions } from './CommonSqlProvider'
import PROVIDER, { Source } from '../server/Source'


export class Postgres implements IProvider.IProvider {
    public ProviderName = PROVIDER.POSTGRES
    public SourceName: string
    public Params: TSourceParams = <TSourceParams>{}
    public Primitive = Pool
    public Connection: Pool | undefined = undefined
    public Config: TJson = {}

    Options = new CommonSqlProviderOptions()

    constructor(sourceName: string, oParams: TJson) {
        this.SourceName = sourceName
        this.Init(<TSourceParams>oParams)
        this.Connect()
    }

    async Init(oParams: TSourceParams): Promise<void> {
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
        if (this.Connection !== undefined) {
            this.Connection.end()
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} Postgres.Insert: ${JSON.stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.INSERT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const _sqlQuery = new SqlQueryHelper()
            .Insert(`"${schemaRequest.entityName}"`)
            .Fields(options.Data.GetFieldNames())
            .Values(options.Data.Rows)
            .Query

        await this.Connection.query(_sqlQuery)
        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
        return schemaResponse
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Postgres.Select: ${JSON.stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.SELECT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const _sqlQuery = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`"${schemaRequest.entityName}"`)
            .Where(options.Filter)
            .OrderBy(options.Sort)
            .Query

        const _data = await this.Connection.query(_sqlQuery)
        if (_data.rows.length > 0) {
            const _dt = new DataTable(schemaRequest.entityName, _data.rows)
            Cache.Set(schemaRequest, _dt)
            schemaResponse = <TSchemaResponseData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: _dt
            }
        } else {
            schemaResponse = <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        return schemaResponse
    }

    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Postgres.Update: ${JSON.stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const _sqlQuery = new SqlQueryHelper()
            .Update(`"${schemaRequest.entityName}"`)
            .Set(options.Data.Rows)
            .Where(options.Filter)
            .Query

        await this.Connection.query(_sqlQuery)
        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
        return schemaResponse
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Postgres.Delete : ${JSON.stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.DELETE
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const _sqlQuery = new SqlQueryHelper()
            .Delete()
            .From(`"${schemaRequest.entityName}"`)
            .Where(options.Filter)
            .Query

        await this.Connection.query(_sqlQuery)
        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
        return schemaResponse
    }
}