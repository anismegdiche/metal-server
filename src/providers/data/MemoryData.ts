//
//
//
//
//
import typia from "typia"
import _ from "lodash"
//
import { RESPONSE } from '../../lib/Const'
import { TConfigSource } from "../../types/TConfig"
import { TOptionalParameter } from "../../types/TOptionalParameter"
import { TSchemaResponse } from '../../types/TSchemaResponse'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { DATA_PROVIDER } from '../../providers/DataProvider'
import { DataBase } from '../../types/DataBase'
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { JsonHelper } from "../../lib/JsonHelper"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { absDataProvider } from "../absDataProvider"
import { TContext } from "../../@types/TContext"


//
export type TMemoryDataOptions = {
    autocreate?: boolean            // v0.3, Auto create table if not exist
}


//
export type TMemoryDataConfig = {
    database: string,
    options?: TMemoryDataOptions
}


//
export class MemoryData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.MEMORY
    Config: TMemoryDataConfig = <TMemoryDataConfig>{}
    Connection?: DataBase = undefined

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        Logger.Debug(`${Logger.Out} MemoryData.Init`)
        this.SourceName = source
        this.Config = {
            database: sourceConfig.database ?? 'memory',
            options: sourceConfig.options
        }
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return `\`${entity}\``
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return `\`${field}\``
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        this.Connection = new DataBase(this.Config.database)
        Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Config.database})'`)
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Info(`${Logger.In} '${this.SourceName} (${this.Config.database})' disconnected`)
        this.Connection = undefined
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schema,
            entity
        }

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context, 
            this.GetContext(schemaRequest)
        )
        

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const data = new DataTable(entity)

        const memoryDataTable = await this.Connection.Tables[entity].FreeSqlAsync(sqlQuery, sqlQueryHelper.Data)

        if (memoryDataTable && memoryDataTable.Rows.length > 0) {
            data.AddRows(memoryDataTable.Rows)
            if (options?.Cache)
                Cache.Set({
                    ...schemaRequest,
                    source: this.SourceName
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
    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context, 
            this.GetContext(schemaRequest)
        )
        
        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schema}: data is missing`)

        this.Connection.Tables[entity].AddRows(options.Data.Rows)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context, 
            this.GetContext(schemaRequest)
        )
        
        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const sqlQueryHelper = this.GenerateSqlUpdate(schemaRequest, options)

        await this.Connection.Tables[entity].FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }


    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context, 
            this.GetContext(schemaRequest)
        )
        
        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlDelete(schemaRequest, options)

        await this.Connection.Tables[entity].FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { entity } = schemaRequest
        const autoCreate: boolean = this.Config.options?.autocreate ?? false

        if (autoCreate &&
            !Object.keys(this.Connection.Tables).includes(entity)) {
            this.Connection.AddTable(entity)
        }

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { schema } = schemaRequest

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