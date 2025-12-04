//
//
//
import _ from "lodash"
import mysql, { Pool } from 'mysql2/promise'
//
import { RESPONSE } from '../../core/@consts'
import { TConfigSource } from "../types/TConfigSource"
import { TOptionalParameter } from "../types/TOptionalParameter"
import { DataTable, TRow } from "../../../types/DataTable"
import { TSchemaResponse } from '../../schema/types/TSchemaResponse'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../schema/types/TSchemaRequest'
import { Cache } from '../../cache/Cache'
import { Logger } from '../../../utils/Logger'
import { DATA_PROVIDER } from "../@consts"
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../errors/HttpErrors"
import { TInternalResponse } from "../../schema/types/TInternalResponse"
import { HttpResponse } from "../../core/HttpResponse"
import { absDataProvider } from "../base/absDataProvider"
import { TContext } from "../../sandbox/types/TContext"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { TIpPort } from "../../../types/TIpPort"
import { Assert } from "../../../utils/Assert"


//
export type TMySqlDataConfig = {
    host: string
    port: TIpPort
    user: string
    password: string
    database: string
    options?: mysql.PoolOptions
}

export class MySqlData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.MYSQL
    Config: TMySqlDataConfig = <TMySqlDataConfig>{}
    Connection?: Pool

    DEFAULT: Partial<TMySqlDataConfig> = {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'mysql',
        options: {
            waitForConnections: true,
            connectionLimit: 10,
            maxIdle: 10,
            idleTimeout: 60_000,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        }
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        await super.Init(source, sourceConfig)
        this.Config = _.merge(this.DEFAULT, sourceConfig as TMySqlDataConfig)
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        const { host, port, user, password, database, options } = this.Config

        try {
            this.Connection = mysql.createPool({
                host,
                port,
                user,
                password,
                database,
                ...options
            })

            // Test connection
            await this.Connection.query('SELECT 1')
            Logger.Info(`Connected to MySQL database '${database}' at ${host}:${port}`)
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error'

            Logger.Error(`Failed to connect to MySQL database '${database}' at ${host}:${port}: ${errorMessage}`)
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
    @SynchronizerManager.Synchronized()
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        const connection = await this.#EnsureConnection()


        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const [rows] = await connection.query(sqlQueryHelper.Query())

        const data = new DataTable(schemaRequest.entity)

        if (Array.isArray(rows) && rows.length > 0) {
            await data.RowsSet(<TRow[]>rows)
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


        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!DataTable.Is(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const sqlQueryHelper = await this.GenerateSqlInsert(schemaRequest, options)

        try {
            const connection = await this.#EnsureConnection()
            await connection.query(sqlQueryHelper.Query())
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
        const connection = await this.#EnsureConnection()


        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!DataTable.Is(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const sqlQueryHelper = await this.GenerateSqlUpdate(schemaRequest, options)

        await connection.query(sqlQueryHelper.Query())
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        const connection = await this.#EnsureConnection()


        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlDelete(schemaRequest, options)

        await connection.query(sqlQueryHelper.Query())
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }


    @Logger.LogFunction()
    async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented('AddEntity operation is not implemented')
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {

        const connection = await this.#EnsureConnection()

        const { schema } = schemaRequest

        const sqlQuery = `
                SELECT 
                    TABLE_NAME AS name, 
                    'table' AS type, 
                    TABLE_ROWS AS size 
                FROM information_schema.tables 
                WHERE table_schema = ?`

        const [rows] = await connection.query(sqlQuery, [schema])

        if (!Array.isArray(rows) || rows.length === 0) {
            throw new HttpErrorNotFound(`No entities found in schema '${schema}'`)
        }

        const data = new DataTable(undefined, rows as TRow[])

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
            data
        })
    }


    EscapeEntity(entity: string): string {
        return `\`${entity}\``
    }


    EscapeField(field: string): string {
        return `\`${field}\``
    }

    async #EnsureConnection(): Promise<Pool> {
        Assert.Var<mysql.Pool>(this.Connection, this.Connection !== undefined, 'Failed to establish database connection')

        await this.Connect()

        return this.Connection
    }
}