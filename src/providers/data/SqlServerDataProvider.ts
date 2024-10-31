//
//
//
//
//
import mssql, { ConnectionPool } from 'mssql'
//
import { RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { TConfigSource } from "../../types/TConfig"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TOptions } from "../../types/TOptions"
import { DataTable } from "../../types/DataTable"
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Logger } from '../../utils/Logger'
import { Cache } from '../../server/Cache'
import DATA_PROVIDER from '../../server/Source'
import { HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { TJson } from "../../types/TJson"
import { JsonHelper } from "../../lib/JsonHelper"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"


export class SqlServerDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.MSSQL
    Connection?: ConnectionPool = undefined
    SourceName: string
    Params: TConfigSource = <TConfigSource>{}
    Config: TJson = {}

    Options = new CommonSqlDataProviderOptions()

    constructor(sourceName: string, sourceParams: TConfigSource) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    @Logger.LogFunction()
    async Init(sourceParams: TConfigSource): Promise<void> {
        this.Params = sourceParams
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
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
            Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${database})'`)
        } catch (error: unknown) {
            Logger.Error(`${Logger.Out} Failed to connect to '${this.SourceName} (${database})': ${host}: ${port}[${database}]`)
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

        let schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity
        }

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

    // @Logger.LogFunction()
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