//
//
//
//
//
import { Pool } from 'pg'
//
import { RESPONSE_TRANSACTION, RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { TSourceParams } from "../../types/TSourceParams"
import { TOptions } from "../../types/TOptions"
import { DataTable } from "../../types/DataTable"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from '../../types/TSchemaResponse'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { CommonSqlDataProviderOptions } from './CommonSqlDataProvider'
import DATA_PROVIDER, { Source } from '../../server/Source'
import { TJson } from "../../types/TJson"
import { HttpErrorNotImplemented } from "../../server/HttpErrors"


export class PostgresDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.POSTGRES
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Connection?: Pool = undefined
    Config: TJson = {}

    Options = new CommonSqlDataProviderOptions()

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    @Logger.LogFunction()
    async Init(sourceParams: TSourceParams): Promise<void> {
        this.Params = sourceParams
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        const sourceName = this.SourceName
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
                        Logger.Info(`${Logger.Out} connected to '${sourceName} (${database})'`)

                } catch (error: unknown) {
                    Logger.Error(`${Logger.Out} Failed to connect to '${sourceName} (${database})'`)
                    Logger.Error(error)
                }
            })
        } catch (error: unknown) {
            Logger.Error(`${Logger.Out} Failed to connect to '${sourceName} (${database})'`)
            Logger.Error(error)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        if (this.Connection !== undefined)
            await this.Connection.end()

    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        const schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.INSERT
        }

        if (this.Connection === undefined)
            return Source.ResponseError(schemaResponse)

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Insert(`"${schemaRequest.entityName}"`)
            .Fields(options.Data.GetFieldNames(), '"')
            .Values(options.Data.Rows)

        await this.Connection.query(sqlQueryHelper.Query)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.SELECT
        }

        if (this.Connection === undefined)
            return Source.ResponseError(schemaResponse)


        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`"${schemaRequest.entityName}"`)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const result = await this.Connection.query(sqlQueryHelper.Query)

        if (result.rows.length > 0) {
            const _dt = new DataTable(schemaRequest.entityName, result.rows)
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

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

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
            .Update(`"${schemaRequest.entityName}"`)
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

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.DELETE
        }

        if (this.Connection === undefined)
            return Source.ResponseError(schemaResponse)

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`"${schemaRequest.entityName}"`)
            .Where(options.Filter)

        await this.Connection.query(sqlQueryHelper.Query)

        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
        return schemaResponse
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        const schemaName = schemaRequest.schemaName
        const entityName = `${schemaRequest.schemaName}-entities`

        let schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.LIST_ENTITIES
        }

        if (this.Connection === undefined)
            return Source.ResponseError(schemaResponse)

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

        if (result?.rows.length > 0) {
            const _dt = new DataTable(entityName, result.rows)
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
}