//
//
//
//
//
import mssql, { ConnectionPool } from 'mssql'

import { RESPONSE_TRANSACTION, RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { TSourceParams } from "../../types/TSourceParams"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../../types/TSchemaResponse"
import { TOptions } from "../../types/TOptions"
import { DataTable } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Logger } from '../../lib/Logger'
import { Cache } from '../../server/Cache'
import { CommonSqlDataProviderOptions } from './CommonSqlDataProvider'
import DATA_PROVIDER, { Source } from '../../server/Source'
import { JsonHelper } from '../../lib/JsonHelper'


export class SqlServerDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.MSSQL
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Connection?: ConnectionPool = undefined
    Config: TJson = {}

    Options = new CommonSqlDataProviderOptions()

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    async Init(sourceParams: TSourceParams): Promise<void> {
        Logger.Debug("SqlServerDataProvider.Init")
        this.Params = sourceParams
    }

    async Connect(): Promise<void> {
        Logger.Debug("SqlServerDataProvider.Connect")
        const {
            user = 'sa',
            password = '',
            database = 'master',
            host = 'localhost',
            port = 1433,
            options = {
                pool: {
                    max: 10,
                    min: 0,
                    idleTimeoutMillis: 30_000
                },
                options: {
                    encrypt: false, // true for azure
                    trustServerCertificate: true // change to true for local dev / self-signed certs
                }
            }
        } = this.Params ?? {}
        
        const connectionConfig = {
            user,
            password,
            database,
            server: host,
            port,
            ...options
        }
        try {
            this.Connection = await mssql.connect(connectionConfig)
            Logger.Info(`${Logger.In} connected to '${this.SourceName} (${database})'`)
        } catch (error: unknown) {
            Logger.Error(`${Logger.In} Failed to connect to '${this.SourceName} (${database})': ${host}: ${port}[${database}]`)
            Logger.Error(JSON.stringify(error))
        }
    }

    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.In} SqlServerDataProvider.Disconnect`)
        if (this.Connection !== undefined) {
            this.Connection.close()
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} SqlServerDataProvider.Insert: ${JsonHelper.Stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.INSERT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Insert(`[${schemaRequest.entityName}]`.replace(/\./g, "].["))
            .Fields(options.Data.GetFieldNames())
            .Values(options.Data.Rows)            

        await this.Connection.query(sqlQueryHelper.Query)
        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
        return schemaResponse
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} SqlServerDataProvider.Select: ${JsonHelper.Stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.SELECT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`[${schemaRequest.entityName}]`.replace(/\./g, "].["))
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const data = await this.Connection.query(sqlQueryHelper.Query)
        if (data.recordset != null && data.recordset.length > 0) {
            const _dt = new DataTable(schemaRequest.entityName, data.recordset)
            if (options?.Cache)
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
        Logger.Debug(`SqlServerDataProvider.Update: ${JsonHelper.Stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`[${schemaRequest.entityName}]`.replace(/\./g, "].["))
            .Set(options.Data.Rows)
            .Where(options.Filter)            

        await this.Connection.query(sqlQueryHelper.Query)
        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
        return schemaResponse
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`SqlServerDataProvider.Delete: ${JsonHelper.Stringify(schemaRequest)}`)

        const schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.DELETE
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`[${schemaRequest.entityName}]`.replace(/\./g, "].["))
            .Where(options.Filter)            

        await this.Connection.query(sqlQueryHelper.Query)
        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
    }
}