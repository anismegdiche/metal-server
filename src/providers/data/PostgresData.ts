//
//
//
//
//
import { Pool } from 'pg'
//
import { RESPONSE } from '../../lib/Const'
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { TConfigSource, TConfigSourceOptions } from "../../types/TConfig"
import { TOptions } from "../../types/TOptions"
import { DataTable } from "../../types/DataTable"
import { TSchemaResponse } from '../../types/TSchemaResponse'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { DATA_PROVIDER } from '../../providers/DataProvider'
import { HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { JsonHelper } from "../../lib/JsonHelper"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { absDataProvider } from "../absDataProvider"


//
export type TPostgresDataConfig = {
    host: string,
    port: number,
    user: string,
    password: string,
    database: string,
    options?: TConfigSourceOptions
}


//
export class PostgresData extends absDataProvider {
    SourceName?: string | undefined

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return `"${entity}"`
    }
    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return `"${field}"`
    }

    ProviderName = DATA_PROVIDER.POSTGRES
    Params: TPostgresDataConfig = <TPostgresDataConfig>{}
    Connection?: Pool = undefined

    constructor() {
        super()
    }

     
    @Logger.LogFunction()
    async Init(source: string, sourceParams: TConfigSource): Promise<void> {
        Logger.Debug("PostgresData.Init")
        this.SourceName = source
        this.Params = {
            host: sourceParams.host ?? 'localhost',
            port: sourceParams.port ?? 5432,
            user: sourceParams.user ?? 'root',
            password: sourceParams.password ?? '',
            database: sourceParams.database ?? 'postgres',
            options: sourceParams.options
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        const source = this.SourceName
        const {
            user = 'root',
            password = '',
            database = 'postgres',
            host = 'localhost',
            port = 5432,
            options
        } = this.Params ?? {}

        try {
            this.Connection = new Pool({
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
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Insert(`"${schemaRequest.entity}"`)
            .Fields(options.Data.GetFieldNames(), '"')
            .Values(options.Data.Rows)

        await this.Connection.query(sqlQueryHelper.Query)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        //TODO check if entity exists, if not return 404

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`"${schemaRequest.entity}"`)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const result = await this.Connection.query(sqlQueryHelper.Query)

        const data = new DataTable(schemaRequest.entity)

        if (result.rows.length > 0) {
            data.AddRows(result.rows)
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

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        //TODO check if entity exists, if not return 404

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`"${schemaRequest.entity}"`)
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await this.Connection.query(sqlQueryHelper.Query)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        //TODO check if entity exists, if not return 404

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`"${schemaRequest.entity}"`)
            .Where(options.Filter)

        await this.Connection.query(sqlQueryHelper.Query)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const { schema } = schemaRequest

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const options: TOptions = this.Options.Parse(schemaRequest)

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
        let result = await this.Connection.query(sqlQuery)

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

        result = await this.Connection.query(sqlQuery)

        if (result?.rows.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)


        const data = new DataTable(undefined, result.rows)
        if (options?.Cache)
            Cache.Set(schemaRequest, data)

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }
}