//
//
//
import _ from "lodash"
//
import { RESPONSE } from '../../core/@consts'
import { TConfigSource } from "../types/TConfigSource"
import { TDataListEntity } from "../types/TDataListEntity"
import { TOptionalParameter } from "../types/TOptionalParameter"
import { TSchemaResponse } from '../../schema/types/TSchemaResponse'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../schema/types/TSchemaRequest'
import { Cache } from '../../cache/Cache'
import { Logger } from '../../../utils/Logger'
import { DATA_ENTITY, DATA_PROVIDER } from "../@consts"
import { DataBase } from '../../../types/DataBase'
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { JsonUtils } from "../../../utils/JsonUtils"
import { TInternalResponse } from "../../schema/types/TInternalResponse"
import { HttpResponse } from "../../core/HttpResponse"
import { absDataProvider } from "../base/absDataProvider"
import { TContext } from "../../sandbox/types/TContext"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { Assert } from "../../../utils/Assert"
import { absStorageProvider } from "../../storage/base/absStorageProvider"


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
    ProviderName = DATA_PROVIDER?.MEMORY
    Config: TMemoryDataConfig = <TMemoryDataConfig>{}
    Connection?: DataBase = undefined

    DEFAULT: Partial<TMemoryDataConfig> = {
        options: {
            autocreate: false
        }
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        await super.Init(source, sourceConfig)
        this.Config = _.merge(
            this.DEFAULT,
            sourceConfig as TMemoryDataConfig
        )
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert.Var<string>(this.SourceName, this.SourceName !== undefined, 'SourceName is required')
        this.Connection = new DataBase(this.Config.database ?? this.SourceName)
        Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Config.database})'`)
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Info(`${Logger.In} '${this.SourceName} (${this.Config.database})' disconnected`)
        this.Connection = undefined
    }

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized()
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schema,
            entity
        }

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)


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
            throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        await this.AddEntity(schemaRequest)

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)


        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!DataTable.Is(options.Data))
            throw new HttpErrorBadRequest(`${schema}: data is missing`)

        this.Connection.Tables[entity].AddRows(options.Data.Rows)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)


        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!DataTable.Is(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const sqlQueryHelper = this.GenerateSqlUpdate(schemaRequest, options)

        await this.Connection.Tables[entity].FreeSqlAsync(sqlQueryHelper.Query(), sqlQueryHelper.Data)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        if (this.Connection.Tables[entity] === undefined)
            throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)

        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlDelete(schemaRequest, options)

        await this.Connection.Tables[entity].FreeSqlAsync(sqlQueryHelper.Query(), sqlQueryHelper.Data)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

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
        Assert.Var<absStorageProvider>(this.Connection, this.Connection !== undefined, `${this.SourceName}: Storage provider is not defined`)

        const { schema } = schemaRequest

        const rows = Object.keys(this.Connection.Tables).map(entity => (<TDataListEntity>{
            name: entity,
            type: DATA_ENTITY.DATATABLE,
            size: this.Connection?.Tables[entity].Rows.length
        }))

        if (rows.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
            data: new DataTable(undefined, rows)
        })
    }

    EscapeEntity(entity: string): string {
        return `\`${entity}\``
    }

    EscapeField(field: string): string {
        return `\`${field}\``
    }
}