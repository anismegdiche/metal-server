//
//
//
//
//
import mssql, { ConnectionPool } from 'mssql'
//
import { RESPONSE_TRANSACTION, RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { TSourceParams } from "../../types/TSourceParams"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseError, TSchemaResponseNoData } from "../../types/TSchemaResponse"
import { TOptions } from "../../types/TOptions"
import { DataTable } from "../../types/DataTable"
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Logger } from '../../utils/Logger'
import { Cache } from '../../server/Cache'
import DATA_PROVIDER, { Source } from '../../server/Source'
import { CommonDataProvider } from "./CommonDataProvider"


export class SqlServerDataProvider extends CommonDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.MSSQL
    Connection?: ConnectionPool = undefined

    @Logger.LogFunction()
    async Init(sourceParams: TSourceParams): Promise<void> {
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
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

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

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

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

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

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

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        
        const schemaName = schemaRequest.schemaName
        const entityName = `${schemaRequest.schemaName}-entities`

        let schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.LIST_ENTITIES
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

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

        const data = await this.Connection.query(sqlQuery)
        
        if (data?.recordset.length > 0) {
            const _dt = new DataTable(entityName, data.recordset)
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