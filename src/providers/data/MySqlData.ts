//
//
//
//
//
import mysql, { Pool } from 'mysql2/promise'
import typia from "typia"
//
import { RESPONSE } from '../../lib/Const'
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { TConfigSource } from "../../types/TConfig"
import { TOptionalParameter } from "../../types/TOptionalParameter"
import { DataTable, TRow } from "../../types/DataTable"
import { TSchemaResponse } from '../../types/TSchemaResponse'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { DATA_PROVIDER } from '../../providers/DataProvider'
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { absDataProvider } from "../absDataProvider"
import { TContext } from "../../@types/TContext"
import _ from "lodash"

export class MySqlData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.MYSQL
    Config: mysql.PoolOptions = <mysql.PoolOptions>{}
    Connection?: Pool

    constructor() {
        super()
    }

    // CURRENT use DEFAULT and merge
    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        Logger.Debug("MySqlData.Init")
        this.SourceName = source

        // default MySql options
        const options = {
            waitForConnections: true,
            connectionLimit: 10,
            maxIdle: 10,
            idleTimeout: 60000,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
            ...sourceConfig?.options
        }

        this.Config = {
            host: sourceConfig?.host ?? 'localhost',
            port: sourceConfig?.port ?? 3306,
            user: sourceConfig?.user ?? 'root',
            password: sourceConfig?.password ?? '',
            database: sourceConfig?.database ?? 'mysql',
            ...options
        }
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return `\`${entity}\``
    }
    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return `\`${field}\``
    }

    private async ensureConnection(): Promise<Pool> {
        if (!this.Connection)
            await this.Connect()

        if (!this.Connection)
            throw new HttpErrorInternalServerError('Failed to establish database connection')

        return this.Connection
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        try {
            this.Connection = mysql.createPool(this.Config)

            // Test connection
            await this.Connection.query('SELECT 1')
            Logger.Info(`Connected to MySQL database '${this.Config.database}' at ${this.Config.host}:${this.Config.port}`)
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error'

            Logger.Error(`Failed to connect to MySQL database '${this.Config.database}' at ${this.Config.host}:${this.Config.port}: ${errorMessage}`)
            throw new HttpErrorInternalServerError(`Database connection failed: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        try {
            if (this.Connection) {
                await this.Connection.end()
                this.Connection = undefined
                Logger.Info(`Disconnected from MySQL database`)
            }
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error'
            Logger.Error(`Error disconnecting from MySQL: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        const connection = await this.ensureConnection()

        const { entity } = schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(this.EscapeEntity(entity))
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const [rows] = await connection.query(sqlQueryHelper.Query)
        const data = new DataTable(schemaRequest.entity)

        if (Array.isArray(rows) && rows.length > 0) {
            data.AddRows(<TRow[]>rows)
            if (options?.Cache) {
                Cache.Set(schemaRequest, data)
            }
        }

        return HttpResponse.Ok(<TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        const connection = await this.ensureConnection()

        try {
            // eslint-disable-next-line no-param-reassign
            $context = _.merge(
                $context,
                this.GetContext(schemaRequest)
            )

            const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

            if (!typia.is<DataTable>(options.Data))
                throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

            const { entity } = schemaRequest

            const sqlQueryHelper = new SqlQueryHelper()
                .Insert(this.EscapeEntity(entity))
                .Fields(options.Data.GetFieldNames(), '`')
                .Values(options.Data.Rows)

            await connection.query(sqlQueryHelper.Query)
            Cache.Remove(schemaRequest)

            return HttpResponse.Created()
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error'
            throw new HttpErrorInternalServerError(`Insert operation failed: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        const connection = await this.ensureConnection()

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const { entity } = schemaRequest

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(this.EscapeEntity(entity))
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await connection.query(sqlQueryHelper.Query)
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        const connection = await this.ensureConnection()

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const { entity } = schemaRequest

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(this.EscapeEntity(entity))
            .Where(options.Filter)

        await connection.query(sqlQueryHelper.Query)
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented('AddEntity operation is not implemented')
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {

        const connection = await this.ensureConnection()

        const sqlQuery = `
                SELECT 
                    TABLE_NAME AS name, 
                    'table' AS type, 
                    TABLE_ROWS AS size 
                FROM information_schema.tables 
                WHERE table_schema = ?`

        const [rows] = await connection.query(sqlQuery, [schemaRequest.schema])

        if (!Array.isArray(rows) || rows.length === 0) {
            throw new HttpErrorNotFound(`No entities found in schema '${schemaRequest.schema}'`)
        }

        const data = new DataTable(undefined, rows as TRow[])

        return HttpResponse.Ok(<TSchemaResponse>{
            schema: schemaRequest.schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }
}