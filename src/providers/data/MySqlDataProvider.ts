//
//
//
import mysql, { Pool } from 'mysql2/promise'
//
import { RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { TConfigSource } from "../../types/TConfig"
import { TOptions } from "../../types/TOptions"
import { DataTable, TRow } from "../../types/DataTable"
import { TSchemaResponse } from '../../types/TSchemaResponse'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { CommonSqlDataProviderOptions } from './CommonSqlDataProvider'
import DATA_PROVIDER from '../../server/Source'
import { TJson } from "../../types/TJson"
import { HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"

export class MySqlDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.MYSQL;
    SourceName: string
    Params: TConfigSource = <TConfigSource>{};
    Connection?: Pool
    Config: TJson = {};
    Options = new CommonSqlDataProviderOptions();

    constructor(source: string, sourceParams: TConfigSource) {
        this.SourceName = source
        this.Init(sourceParams)
    }

    @Logger.LogFunction()
    async Init(sourceParams: TConfigSource): Promise<void> {
        this.Params = sourceParams
        await this.Connect()
    }

    private async ensureConnection(): Promise<Pool> {
        if (!this.Connection) {
            await this.Connect()
        }
        if (!this.Connection) {
            throw new HttpErrorInternalServerError('Failed to establish database connection')
        }
        return this.Connection
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        const {
            user = 'root',
            password = '',
            database = 'mysql',
            host = 'localhost',
            port = 3306,
            options = {}
        } = this.Params ?? {}

        try {
            this.Connection = mysql.createPool({
                user,
                password,
                database,
                host,
                port,
                ...options,
                waitForConnections: true,
                connectionLimit: 10,
                maxIdle: 10,
                idleTimeout: 60000,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            })

            // Test connection
            const [result] = await this.Connection.query('SELECT 1')
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
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const connection = await this.ensureConnection()

        try {
            const options: TOptions = this.Options.Parse(schemaRequest)
            const sqlQueryHelper = new SqlQueryHelper()
                .Insert(`\`${schemaRequest.entity}\``)
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
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        const connection = await this.ensureConnection()

        try {
            const options: TOptions = this.Options.Parse(schemaRequest)
            const sqlQueryHelper = new SqlQueryHelper()
                .Select(options.Fields)
                .From(`\`${schemaRequest.entity}\``)
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
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error'
            throw new HttpErrorInternalServerError(`Select operation failed: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const connection = await this.ensureConnection()

        try {
            const options: TOptions = this.Options.Parse(schemaRequest)
            const sqlQueryHelper = new SqlQueryHelper()
                .Update(`\`${schemaRequest.entity}\``)
                .Set(options.Data.Rows)
                .Where(options.Filter)

            await connection.query(sqlQueryHelper.Query)
            Cache.Remove(schemaRequest)

            return HttpResponse.NoContent()
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error'
            throw new HttpErrorInternalServerError(`Update operation failed: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const connection = await this.ensureConnection()

        try {
            const options: TOptions = this.Options.Parse(schemaRequest)
            const sqlQueryHelper = new SqlQueryHelper()
                .Delete()
                .From(`\`${schemaRequest.entity}\``)
                .Where(options.Filter)

            await connection.query(sqlQueryHelper.Query)
            Cache.Remove(schemaRequest)

            return HttpResponse.NoContent()
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error'
            throw new HttpErrorInternalServerError(`Delete operation failed: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented('AddEntity operation is not implemented')
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        const connection = await this.ensureConnection()

        try {
            const options: TOptions = this.Options.Parse(schemaRequest)
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
            if (options?.Cache) {
                Cache.Set(schemaRequest, data)
            }

            return HttpResponse.Ok(<TSchemaResponse>{
                schema: schemaRequest.schema,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data
            })
        } catch (error) {
            if (error instanceof HttpErrorNotFound) {
                throw error
            }
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error'
            throw new HttpErrorInternalServerError(`ListEntities operation failed: ${errorMessage}`)
        }
    }
}