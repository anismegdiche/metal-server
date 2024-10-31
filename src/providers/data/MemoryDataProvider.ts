//
//
//
//
//
import { RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { TConfigSource } from "../../types/TConfig"
import { TOptions } from "../../types/TOptions"
import { TSchemaResponse } from '../../types/TSchemaResponse'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import DATA_PROVIDER from '../../server/Source'
import { DataBase } from '../../types/DataBase'
import { TJson } from "../../types/TJson"
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { JsonHelper } from "../../lib/JsonHelper"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"


export type TMemoryDataProviderOptions = {
    // v0.3
    autoCreate?: boolean            // Auto create table if not exist
}

export class MemoryDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.MEMORY
    SourceName: string
    Params: TConfigSource = <TConfigSource>{}
    Config: TJson = {}
    Connection?: DataBase = undefined

    Options = new CommonSqlDataProviderOptions()

    constructor(sourceName: string, sourceParams: TConfigSource) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    @Logger.LogFunction()
    async Init(sourceParams: TConfigSource): Promise<void> {
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
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        const { schema, entity } = schemaRequest

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)

        const options: TOptions = this.Options.Parse(schemaRequest)

        this.Connection.Tables[entity].AddRows(options.Data.Rows)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const { schema, entity } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schema,
            entity
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        // removed: in case of autoCreate and select, entity should not be created
        //await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entity}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined)
            ? sqlQueryHelper.Query
            : undefined

        const data = new DataTable(entity)

        const memoryDataTable = await this.Connection.Tables[entity].FreeSqlAsync(sqlQuery, sqlQueryHelper.Data)

        if (memoryDataTable && memoryDataTable.Rows.length > 0) {
            data.AddRows(memoryDataTable.Rows)
            if (options?.Cache)
                Cache.Set({
                    ...schemaRequest,
                    sourceName: this.SourceName
                },
                    data
                )
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

        const { schema, entity } = schemaRequest

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        // removed: in case of autoCreate and select, entity should not be created
        //await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`\`${entity}\``)
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await this.Connection.Tables[entity].FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)
        
        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }


    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        const { schema, entity } = schemaRequest

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        // removed: in case of autoCreate and select, entity should not be created
        //await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)

        const options: TOptions = this.Options.Parse(schemaRequest)

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`\`${entity}\``)
            .Where(options.Filter)

        await this.Connection.Tables[entity].FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)
        
        // clean cache
        Cache.Remove(schemaRequest)
        
        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { entity } = schemaRequest

        if (this.Params.options?.autoCreate === true &&
            !Object.keys(this.Connection.Tables).includes(entity)) {
            this.Connection.AddTable(entity)
        }

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const { schema } = schemaRequest

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const rows = Object.keys(this.Connection.Tables).map(entity => ({
            name: entity,
            type: 'datatable',
            size: this.Connection?.Tables[entity].Rows.length
        }))

        if (rows.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data: new DataTable(undefined, rows)
        })
    }
}