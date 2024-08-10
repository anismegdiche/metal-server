//
//
//
//
//

import { RESPONSE_TRANSACTION, RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { TSourceParams } from "../../types/TSourceParams"
import { TOptions } from "../../types/TOptions"
import { TJson } from "../../types/TJson"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from '../../types/TSchemaResponse'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../lib/Logger'
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import DATA_PROVIDER, { Source } from '../../server/Source'
import { DataBase } from '../../types/DataBase'
import { CommonSqlDataProviderOptions } from './CommonSqlDataProvider'
import { JsonHelper } from '../../lib/JsonHelper'


export class MemoryDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.MEMORY
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Config: TJson = {}
    Connection?: DataBase = undefined

    Options = new CommonSqlDataProviderOptions()

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    async Init(sourceParams: TSourceParams): Promise<void> {
        Logger.Debug("MemoryDataProvider.Init")
        this.Params = sourceParams
    }

    async Connect(): Promise<void> {
        Logger.Info(`${Logger.In} connected to '${this.SourceName} (${this.Params.database})'`)

        const {
            database = 'memory'
        } = this.Params

        this.Connection = new DataBase(database)
    }

    async Disconnect(): Promise<void> {
        Logger.Info(`${Logger.In} '${this.SourceName} (${this.Params.database})' disconnected`)
        this.Connection = undefined
    }

     
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} MemoryDataProvider.Insert: ${JsonHelper.Stringify(schemaRequest)}`)
        const schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.INSERT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        if (this.Connection.Tables[schemaRequest.entityName] === undefined) {
            this.Connection.AddTable(schemaRequest.entityName)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)
        this.Connection.Tables[schemaRequest.entityName].AddRows(options.Data.Rows)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`MemoryDataProvider.Select: ${JsonHelper.Stringify(schemaRequest)}`)

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.SELECT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        if (this.Connection.Tables[schemaRequest.entityName] === undefined) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entityName}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined)
            ? sqlQueryHelper.Query
            : undefined

        const memoryDataTable = await this.Connection.Tables[schemaRequest.entityName].FreeSql(sqlQuery, sqlQueryHelper.Data)

        if (memoryDataTable && memoryDataTable.Rows.length > 0) {
            if (options?.Cache)
                Cache.Set({
                    ...schemaRequest,
                    sourceName: this.SourceName
                },
                    memoryDataTable
                )
            return <TSchemaResponseData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: memoryDataTable
            }
        } else {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
    }

     
    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`MemoryDataProvider.Update: ${JsonHelper.Stringify(schemaRequest)}`)
        const { schemaName, entityName } = schemaRequest
        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.UPDATE
        }


        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        if (this.Connection.Tables[schemaRequest.entityName] === undefined) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`\`${entityName}\``)
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await this.Connection.Tables[schemaRequest.entityName].FreeSql(sqlQueryHelper.Query, sqlQueryHelper.Data)
        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
    }

     
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`MemoryDataProvider.Delete : ${JsonHelper.Stringify(schemaRequest)}`)
        const { schemaName, entityName } = schemaRequest
        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.DELETE
        }


        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        if (this.Connection.Tables[schemaRequest.entityName] === undefined) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`\`${entityName}\``)
            .Where(options.Filter)

        await this.Connection.Tables[schemaRequest.entityName].FreeSql(sqlQueryHelper.Query, sqlQueryHelper.Data)
        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
    }
}