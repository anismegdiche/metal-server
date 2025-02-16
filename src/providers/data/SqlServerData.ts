//
//
//
//
//
import mssql, { ConnectionPool } from 'mssql'
import typia from "typia"
import _ from "lodash"
//
import { RESPONSE } from '../../lib/Const'
import { TConfigSource, TConfigSourceOptions } from "../../types/TConfig"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TOptionalParameter } from "../../types/TOptionalParameter"
import { DataTable } from "../../types/DataTable"
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../types/TSchemaRequest'
import { Logger } from '../../utils/Logger'
import { Cache } from '../../server/Cache'
import { DATA_PROVIDER } from '../../providers/DataProvider'
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { JsonHelper } from "../../lib/JsonHelper"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { absDataProvider } from "../absDataProvider"
import { TContext } from "../../@types/TContext"


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

    SourceName?: string
    ProviderName = DATA_PROVIDER.MSSQL
    Config: TSqlServerDataConfig = <TSqlServerDataConfig>{}
    Connection?: ConnectionPool = undefined

    DEFAULT = {
        server: 'localhost',
        database: 'master',
        user: 'sa',
        password: '',
        port: 1433,
        options: {
            encrypt: false,                     // true for azure
            trustServerCertificate: true,       // change to true for local dev / self-signed certs
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30_000
            }
        }
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        Logger.Debug("SqlServerData.Init")
        this.SourceName = source
        this.Config = _.merge(
            this.DEFAULT,
            {
                user: sourceConfig.user,
                password: sourceConfig.password,
                database: sourceConfig.database,
                server: sourceConfig.host,
                port: sourceConfig.port
            },
            {
                options: sourceConfig.options
            }
        )
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return `[${entity}]`.replace(/\./g, "].[")
    }
    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return `[${field}]`
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        try {
            this.Connection = await mssql.connect(this.Config)
            Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Config.database})'`)
        } catch (error: unknown) {
            Logger.Error(`${Logger.Out} Failed to connect to '${this.SourceName} (${this.Config.database})'`)
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
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlServerResult = await this.Connection.query(sqlQueryHelper.Query())

        const data = new DataTable(schemaRequest.entity)

        if (sqlServerResult.recordset != null && sqlServerResult.recordset.length > 0) {
            data.AddRows(sqlServerResult.recordset)
            if (options?.Cache)
                Cache.Set(schemaRequest, data)
        }

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            entity,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const sqlQueryHelper = this.GenerateSqlInsert(schemaRequest, options)

        await this.Connection.query(sqlQueryHelper.Query())

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const sqlQueryHelper = this.GenerateSqlUpdate(schemaRequest, options)

        await this.Connection.query(sqlQueryHelper.Query())

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlDelete(schemaRequest, options)

        await this.Connection.query(sqlQueryHelper.Query())

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { schema } = schemaRequest

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