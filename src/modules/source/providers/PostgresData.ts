//
//
//
// Lazy-loaded pg module
import _ from "lodash"
//
import { RESPONSE } from '../../core/@consts'
import { TConfigSourceOptions } from "../types/TConfigSourceOptions"
import { TConfigSource } from "../types/TConfigSource"
import { TOptionalParameter } from "../types/TOptionalParameter"
import { DataTable } from "../../../types/DataTable"
import { TSchemaResponse } from '../../schema/types/TSchemaResponse'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../schema/types/TSchemaRequest'
import { Cache } from '../../cache/Cache'
import { Logger } from '../../../utils/Logger'
import { DATA_PROVIDER } from "../@consts"
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../errors/HttpErrors"
import { JsonUtils } from "../../../utils/JsonUtils"
import { TInternalResponse } from "../../schema/types/TInternalResponse"
import { HttpResponse } from "../../core/HttpResponse"
import { absDataProvider } from "../base/absDataProvider"
import { TContext } from "../../sandbox/types/TContext"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { TIpPort } from "../../../types/TIpPort"
import { Assert } from '../../../utils/Assert'


//
export type TPostgresDataConfig = {
    provider: DATA_PROVIDER.POSTGRES
    host: string
    port: TIpPort
    user: string
    password: string
    database: string
    options?: TConfigSourceOptions
}


//
export class PostgresData extends absDataProvider {
    private static _pg: typeof import('pg');
    private static async _loadPg(): Promise<typeof import('pg')> {
        if (!this._pg) {
            this._pg = await import('pg');
        }
        return this._pg;
    }

    SourceName?: string
    ProviderName = DATA_PROVIDER.POSTGRES
    Config: TPostgresDataConfig = <TPostgresDataConfig>{}
    Connection?: import('pg').Pool

    DEFAULT: Partial<TPostgresDataConfig> = {
        host: 'localhost',
        port: 5432,
        user: 'root',
        password: '',
        database: 'postgres'
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        await super.Init(source, sourceConfig)
        this.Config = _.merge(this.DEFAULT, sourceConfig as TPostgresDataConfig)
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        const source = this.SourceName
        const { host, port, user, password, database, options } = this.Config

        try {
            const pg = await PostgresData._loadPg();
            this.Connection = new pg.Pool({
                user,
                password,
                database,
                host,
                port,
                ...options
            })
            this.Connection.query('SELECT NOW()', async function (err) {
                try {
                    if (err)
                        throw err
                    else
                        Logger.Info(`${Logger.Out} connected to '${source} (${database})'`)

                } catch (error: unknown) {
                    Logger.Error(`${Logger.Out} Failed to connect to '${source} (${database})'`)
                    Logger.Error(error)
                }
            })
        } catch (error: unknown) {
            Logger.Error(`${Logger.Out} Failed to connect to '${source} (${database})'`)
            Logger.Error(error)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        if (this.Connection !== undefined)
            await this.Connection.end()

    }

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized()
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest


        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const result = await this.Connection.query(sqlQueryHelper.Query())

        const data = new DataTable(entity)

        if (result.rows.length > 0) {
            await data.RowsSet(result.rows)
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
            throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))


        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!DataTable.Is(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const sqlQueryHelper = await this.GenerateSqlInsert(schemaRequest, options)

        await this.Connection.query(sqlQueryHelper.Query())

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))


        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!DataTable.Is(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const sqlQueryHelper = await this.GenerateSqlUpdate(schemaRequest, options)

        await this.Connection.query(sqlQueryHelper.Query())

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))


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


    @Logger.LogFunction()
    async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<import('pg').Pool>(this.Connection, this.Connection !== undefined, `${this.SourceName}: Connection is undefined`)

        const { schema, source } = schemaRequest

        // Refresh analyze
        let sqlQuery = `
            DO $$ 
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN 
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_type = 'BASE TABLE'
                    AND table_schema NOT IN ('pg_catalog', 'information_schema')
                LOOP
                    EXECUTE 'ANALYZE ' || quote_ident(r.table_schema) || '.' || quote_ident(r.table_name);
                END LOOP;
            END $$;
            `

        await this.Connection.query(sqlQuery)

        // Get Data
        sqlQuery = `
            SELECT 
                t.table_name AS name, 
                'table' AS type, 
                CASE 
                    WHEN c.reltuples < 0 THEN NULL  -- or you can replace NULL with a default value
                    ELSE c.reltuples 
                END AS size
            FROM 
                information_schema.tables t
            JOIN 
                pg_class c ON t.table_name = c.relname
            JOIN 
                pg_namespace n ON n.oid = c.relnamespace
            WHERE 
                t.table_type = 'BASE TABLE' 
                AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
                AND n.nspname = t.table_schema;
            `

        const result = await this.Connection.query(sqlQuery)

        if (result?.rows.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)

        const data = new DataTable(source, result.rows)

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
            data
        })
    }


    EscapeEntity(entity: string): string {
        return `"${entity}"`
    }


    EscapeField(field: string): string {
        return `"${field}"`
    }
}