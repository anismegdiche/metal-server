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
import { Logger } from '../../lib/Logger'
import { CommonSqlDataProviderOptions } from './CommonSqlDataProvider'
import DATA_PROVIDER, { Source } from '../../server/Source'
import { JsonHelper } from '../../lib/JsonHelper'
import { TJson } from "../../types/TJson"


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

    async Init(sourceParams: TSourceParams): Promise<void> {
        Logger.Debug("PostgresDataProvider.Init")
        this.Params = sourceParams
    }

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
                        Logger.Info(`${Logger.In} connected to '${sourceName} (${database})'`)

                } catch (error: unknown) {
                    Logger.Error(`${Logger.In} Failed to connect to '${sourceName} (${database})'`)
                    Logger.Error(error)
                }
            })
        } catch (error: unknown) {
            Logger.Error(`${Logger.In} Failed to connect to '${sourceName} (${database})'`)
            Logger.Error(error)
        }
    }

    async Disconnect(): Promise<void> {
        if (this.Connection !== undefined) {
            await this.Connection.end()
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} PostgresDataProvider.Insert: ${JsonHelper.Stringify(schemaRequest)}`)

        const schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.INSERT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

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

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`PostgresDataProvider.Select: ${JsonHelper.Stringify(schemaRequest)}`)

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
            .From(`"${schemaRequest.entityName}"`)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const _data = await this.Connection.query(sqlQueryHelper.Query)
        if (_data.rows.length > 0) {
            const _dt = new DataTable(schemaRequest.entityName, _data.rows)
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

    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`PostgresDataProvider.Update: ${JsonHelper.Stringify(schemaRequest)}`)

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

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`PostgresDataProvider.Delete : ${JsonHelper.Stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
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
}