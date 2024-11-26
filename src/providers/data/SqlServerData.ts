//
//
//
//
//
import mssql, { ConnectionPool } from 'mssql'
//
import { RESPONSE } from '../../lib/Const'
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { TConfigSource, TConfigSourceOptions } from "../../types/TConfig"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TOptions } from "../../types/TOptions"
import { DataTable } from "../../types/DataTable"
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Logger } from '../../utils/Logger'
import { Cache } from '../../server/Cache'
import {DATA_PROVIDER} from '../../server/Source'
import { HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { JsonHelper } from "../../lib/JsonHelper"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { absDataProvider } from "../absDataProvider"


//
export type TSqlServerDataConfig = {
    server: string,
    port: number,
    user: string,
    password: string,
    database: string,
    options: TConfigSourceOptions
}


//
export class SqlServerData extends absDataProvider {
    

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return `[${entity}]`
    }
    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return `[${field}]`
    }

    ProviderName = DATA_PROVIDER.MSSQL
    Params: TSqlServerDataConfig = <TSqlServerDataConfig>{}
    Connection?: ConnectionPool = undefined

    constructor(source: string, sourceParams: TConfigSource) {
        super(source, sourceParams)
        this.Params = {
            user: sourceParams.user ?? 'sa',
            password: sourceParams.password ?? '',
            database: sourceParams.database ?? 'master',
            server: sourceParams.host ?? 'localhost',
            port: sourceParams.port ?? 1433,
            options: {
                pool: {
                    max: 10,
                    min: 0,
                    idleTimeoutMillis: 30_000
                },
                options: {
                    encrypt: false,                     // true for azure
                    trustServerCertificate: true        // change to true for local dev / self-signed certs
                },
                ...sourceParams.options

            }
        }
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Init(): Promise<void> {
        Logger.Debug("SqlServerData.Init")
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        try {
            this.Connection = await mssql.connect(this.Params)
            Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Params.database})'`)
        } catch (error: unknown) {
            Logger.Error(`${Logger.Out} Failed to connect to '${this.SourceName} (${this.Params.database})'`)
            Logger.Error(JSON.stringify(error))
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        if (this.Connection !== undefined) {
            this.Connection.close()
        }
    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Insert(`[${schemaRequest.entity}]`.replace(/\./g, "].["))
            .Fields(options.Data.GetFieldNames())
            .Values(options.Data.Rows)

        await this.Connection.query(sqlQueryHelper.Query)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        let schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity
        }

        if (this.Connection === undefined) {
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`[${schemaRequest.entity}]`.replace(/\./g, "].["))
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlServerResult = await this.Connection.query(sqlQueryHelper.Query)

        const data = new DataTable(schemaRequest.entity)

        if (sqlServerResult.recordset != null && sqlServerResult.recordset.length > 0) {
            data.AddRows(sqlServerResult.recordset)
            if (options?.Cache)
                Cache.Set(schemaRequest, data)
        }

        return HttpResponse.Ok(<TSchemaResponse>{
            ...schemaResponse,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        let schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`[${schemaRequest.entity}]`.replace(/\./g, "].["))
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await this.Connection.query(sqlQueryHelper.Query)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        const schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`[${schemaRequest.entity}]`.replace(/\./g, "].["))
            .Where(options.Filter)

        await this.Connection.query(sqlQueryHelper.Query)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    // eslint-disable-next-line class-methods-use-this
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const { schema } = schemaRequest

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const sqlQuery = `
            SELECT t.name AS name, 
                'table' AS type, 
                SUM(p.rows) AS [size]
            FROM sys.tables t
            JOIN sys.partitions p ON t.object_id = p.object_id
            WHERE p.index_id IN (0, 1) -- 0 for heap tables, 1 for clustered indexes
            GROUP BY t.name
            ORDER BY t.name;
            `

        const sqlServerResult = await this.Connection.query(sqlQuery)

        if (sqlServerResult?.recordset.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data: new DataTable(undefined, sqlServerResult.recordset)
        })
    }
}