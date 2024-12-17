//
//
//
//
//
import _ from "lodash"
//
import { absDataProvider } from "../absDataProvider"
import { RESPONSE } from "../../lib/Const"
import { Logger, VERBOSITY } from "../../utils/Logger"
import { SqlQueryHelper } from "../../lib/SqlQueryHelper"
import { Cache } from "../../server/Cache"
import { DATA_PROVIDER } from "../../providers/DataProvider"
import { TOptions } from "../../types/TOptions"
import { TSchemaRequest } from "../../types/TSchemaRequest"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TConfigSource } from "../../types/TConfig"
import { HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { Convert } from "../../lib/Convert"
// Content
import { CONTENT, ContentProvider, TContentConfig } from "../ContentProvider"
import { absContentProvider } from "../absContentProvider"
// Storage
import { STORAGE, StorageProvider, TStorageConfig } from "../StorageProvider"
import { absStorageProvider } from "../absStorageProvider"


//
export type TFilesDataOptions = {
    // Common
    storage?: STORAGE
    content?: {
        [pattern: string]: {
            type: CONTENT
        } & TContentConfig
    }
    autocreate?: boolean
}
    & TStorageConfig


//
export class FilesData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.FILES
    Params: TConfigSource = <TConfigSource>{}
    Connection?: absStorageProvider = undefined

    // FilesData
    ContentHandler: Record<string, absContentProvider> = {}     // Contents set in confi file
    File: Record<string, absContentProvider> = {}               // Files
    Lock: Map<string, Mutex> = new Map<string, Mutex>()

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceParams: TConfigSource): Promise<void> {
        Logger.Debug(`${Logger.Out} FilesData.Init`)
        this.SourceName = source
        this.Params = sourceParams
        const {
            storage = STORAGE.FILESYSTEM,
            content
        } = this.Params.options as TFilesDataOptions

        if (content === undefined)
            throw new HttpErrorNotImplemented(`${this.SourceName}: Content type is not defined`)

        this.Connection = StorageProvider.GetProvider(storage)
        this.Connection.SetConfig(this.Params)

        // init storage
        if (this.Connection)
            this.Connection.Init()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize storage provider`)

        // init content
        for (const filePattern in content) {
            if (Object.hasOwn(content, filePattern)) {
                const { type } = content[filePattern]
                this.ContentHandler[filePattern] = ContentProvider.GetProvider(type)
                this.ContentHandler[filePattern].SetConfig(content[filePattern])
            }
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

    SetContentHandler(entity: string) {
        if (!_.has(this.File, entity)) {
            const handler = Object.keys(this.ContentHandler).find(pattern => Convert.PatternToRegex(pattern).test(entity))
            if (handler)
                this.File[entity] = this.ContentHandler[handler]
            else
                throw new HttpErrorNotImplemented(`${this.SourceName}: No content handler found for entity ${entity}`)
        }
    }

    SetLock(entity: string) {
        if (!this.Lock.has(entity))
            this.Lock.set(entity, new Mutex())
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        try {
            if (this.Connection && this.ContentHandler) {
                this.Connection.Connect()
                Logger.Debug(`${Logger.Out} Storage provider '${this.SourceName}' connected`)
            }
        } catch (error: any) {
            Logger.Error(`${this.SourceName}: Failed to connect in storage provider: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        try {
            if (this.Connection && this.ContentHandler)
                await this.Connection.Disconnect()
        } catch (error: any) {
            Logger.Error(`${this.SourceName}: Failed to disconnect in storage provider: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entity } = schemaRequest

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.SetContentHandler(entity)
        this.SetLock(entity)
        await this.Lock.get(entity)!.Acquire()

        try {
            this.File[entity].InitContent(
                entity,
                await this.Connection.Read(entity)
            )

            const data = await this.File[entity].Get()

            const sqlQueryHelper = new SqlQueryHelper()
                .Insert(`\`${entity}\``)
                .Fields(options.Data.GetFieldNames(), '`')
                .Values(options.Data.Rows)

            await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)
            await this.Connection.Write(
                entity,
                await this.File[entity].Set(data)
            )

            // clean cache
            Cache.Remove(schemaRequest)

            return HttpResponse.Created()
        } catch (error: any) {
            throw new HttpErrorInternalServerError(`${this.SourceName}: ${error.message}`)
        } finally {
            this.Lock.get(entity)!.Release()
        }
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schema, entity } = schemaRequest

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.SetContentHandler(entity)

        this.File[entity].InitContent(
            entity,
            await this.Connection.Read(entity)
        )

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entity}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const data = await this.File[entity].Get(sqlQuery)

        if (Logger.Level == VERBOSITY.DEBUG)
            data.SetMetaData("__CONTENT_DEBUG__", this.File[entity].GetConfig())

        if (options?.Cache)
            await Cache.Set({
                ...schemaRequest,
                source: this.SourceName
            },
                data
            )

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            entity,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entity } = schemaRequest

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.SetContentHandler(entity)
        this.SetLock(entity)
        await this.Lock.get(entity)!.Acquire()
        try {
            this.File[entity].InitContent(
                entity,
                await this.Connection.Read(entity)
            )

            const data = await this.File[entity].Get()

            const sqlQueryHelper = new SqlQueryHelper()
                .Update(`\`${entity}\``)
                .Set(options.Data.Rows)
                .Where(options.Filter)

            await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

            await this.Connection.Write(
                entity,
                await this.File[entity].Set(data)
            )

            // clean cache
            Cache.Remove(schemaRequest)
            return HttpResponse.NoContent()

        } catch (error: any) {
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to update ${entity} in storage provider: ${error.message}`)
        } finally {
            this.Lock.get(entity)!.Release()
        }
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entity } = schemaRequest


        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.SetContentHandler(entity)
        this.SetLock(entity)
        await this.Lock.get(entity)!.Acquire()

        try {
            this.File[entity].InitContent(
                entity,
                await this.Connection.Read(entity)
            )

            const data = await this.File[entity].Get()

            const sqlQueryHelper = new SqlQueryHelper()
                .Delete()
                .From(`\`${entity}\``)
                .Where(options.Filter)

            await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

            await this.Connection.Write(
                entity,
                await this.File[entity].Set(data)
            )

            // clean cache
            Cache.Remove(schemaRequest)

            return HttpResponse.NoContent()

        } catch (error: any) {
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to update ${entity} in storage provider: ${error.message}`)
        } finally {
            this.Lock.get(entity)!.Release()
        }
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    // eslint-disable-next-line unused-imports/no-unused-vars
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const { schema } = schemaRequest

        const rxFilePatterns = new RegExp(
            `(${Object.keys(this.ContentHandler)
                .map(filePattern => Convert.PatternToRegex(filePattern)
                    .toString()
                    .replace(/\//g, '')
                ).join('|')})`)

        // eslint-disable-next-line init-declarations
        let data: DataTable

        if (this.Connection) {
            data = await this.Connection.List()
            data.Rows = data.Rows.filter(row => rxFilePatterns.test(row.name as string))
        } else {
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)
        }

        if (data.Rows.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }
}
