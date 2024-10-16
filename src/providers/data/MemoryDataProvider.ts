//
//
//
//
//
import { RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { TSourceParams } from "../../types/TSourceParams"
import { TOptions } from "../../types/TOptions"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from '../../types/TSchemaResponse'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import DATA_PROVIDER, { Source } from '../../server/Source'
import { DataBase } from '../../types/DataBase'
import { TJson } from "../../types/TJson"
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { JsonHelper } from "../../lib/JsonHelper"


export type TMemoryDataProviderOptions = {
    // v0.3
    autoCreate?: boolean            // Auto create table if not exist
}

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

    @Logger.LogFunction()
    async Init(sourceParams: TSourceParams): Promise<void> {
        this.Params = sourceParams
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {

        const {
            database = 'memory'
        } = this.Params

        this.Connection = new DataBase(database)
        Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Params.database})'`)
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Info(`${Logger.In} '${this.SourceName} (${this.Params.database})' disconnected`)
        this.Connection = undefined
    }


    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaResponse))

        await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entityName] === undefined)
            throw new HttpErrorNotFound(`Insert: Entity '${entityName}' not found`)

        const options: TOptions = this.Options.Parse(schemaRequest)

        this.Connection.Tables[entityName].AddRows(options.Data.Rows)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaResponse))

        await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entityName] === undefined)
            throw new HttpErrorNotFound(`Select: Entity '${entityName}' not found`)

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entityName}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined)
            ? sqlQueryHelper.Query
            : undefined

        const memoryDataTable = await this.Connection.Tables[entityName].FreeSqlAsync(sqlQuery, sqlQueryHelper.Data)

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


    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaResponse))

        await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entityName] === undefined)
            throw new HttpErrorNotFound(`Update: Entity '${entityName}' not found`)

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`\`${entityName}\``)
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await this.Connection.Tables[entityName].FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)
        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
    }


    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaResponse))

        await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entityName] === undefined)
            throw new HttpErrorNotFound(`Delete: Entity '${entityName}' not found`)

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`\`${entityName}\``)
            .Where(options.Filter)

        await this.Connection.Tables[entityName].FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)
        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        const { schemaName, entityName } = schemaRequest

        if (this.Connection &&
            this.Params.options?.autoCreate === true) {
            this.Connection.AddTable(entityName)
        }

        return <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        const { schemaName } = schemaRequest
        const entityName = `${schemaRequest.schemaName}-entities`

        let schemaResponse = <TSchemaResponse>{
            schemaName
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaResponse))

        const data = Object.keys(this.Connection.Tables).map(entity => ({
            name: entity,
            type: 'datatable',
            size: this.Connection?.Tables[entity].Rows.length
        }))

        if (data.length > 0) {
            const _dt = new DataTable(entityName, data)
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