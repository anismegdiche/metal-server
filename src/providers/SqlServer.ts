//
//
//
//
//
import mssql, { ConnectionPool } from 'mssql'

import { RESPONSE_TRANSACTION, RESPONSE } from '../lib/Const'
import * as IProvider from "../types/IProvider"
import { SqlQueryHelper } from '../lib/SqlQueryHelper'
import { TSourceParams } from "../types/TSourceParams"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../types/TSchemaResponse"
import { TOptions } from "../types/TOptions"
import { DataTable } from "../types/DataTable"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from '../types/TSchemaRequest'
import { Logger } from '../lib/Logger'
import { Cache } from '../server/Cache'
import { CommonSqlProviderOptions } from './CommonSqlProvider'
import PROVIDER, { Source } from '../server/Source'


export class SqlServer implements IProvider.IProvider {
    ProviderName = PROVIDER.MSSQL
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Primitive = mssql
    Connection: ConnectionPool | undefined = undefined
    Config: TJson = {}

    Options = new CommonSqlProviderOptions()

    constructor(sourceName: string, oParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(oParams)
        this.Connect()
    }

    async Init(oParams: TSourceParams): Promise<void> {
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
        if (this.Connection !== undefined) {
            this.Connection.close()
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} SqlServer.Insert: ${JSON.stringify(schemaRequest)}`)

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
            .Insert(`[${schemaRequest.entityName}]`.replace(/\./g, "].["))
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
        Logger.Debug(`${Logger.Out} SqlServer.Select: ${JSON.stringify(schemaRequest)}`)

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
            .From(`[${schemaRequest.entityName}]`.replace(/\./g, "].["))
            .Where(options.Filter)
            .OrderBy(options.Sort)
            .Query

        const data = await this.Connection.query(_sqlQuery)
        if (data.recordset != null && data.recordset.length > 0) {
            const _dt = new DataTable(schemaRequest.entityName, data.recordset)
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
        Logger.Debug(`SqlServer.Update: ${JSON.stringify(schemaRequest)}`)

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
            .Update(`[${schemaRequest.entityName}]`.replace(/\./g, "].["))
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
        Logger.Debug(`SqlServer.Delete: ${JSON.stringify(schemaRequest)}`)

        const schemaResponse = <TSchemaResponse>{
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
            .From(`[${schemaRequest.entityName}]`.replace(/\./g, "].["))
            .Where(options.Filter)
            .Query

        await this.Connection.query(_sqlQuery)
        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
    }
}