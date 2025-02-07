//
//
//
//
//
import _ from "lodash"
import typia from "typia"
//
import { absDataProvider } from "../absDataProvider"
import { RESPONSE } from "../../lib/Const"
import { Logger, VERBOSITY } from "../../utils/Logger"
import { SqlQueryHelper } from "../../lib/SqlQueryHelper"
import { Cache } from "../../server/Cache"
import { DATA_PROVIDER } from "../../providers/DataProvider"
import { TOptionalParameter } from "../../types/TOptionalParameter"
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from "../../types/TSchemaRequest"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TConfigSource } from "../../types/TConfig"
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { Convert } from "../../lib/Convert"
// Content
import { absContentProvider } from "../absContentProvider"
import { CONTENT, ContentProvider, TContentConfig } from "../ContentProvider"
// Storage
import { absStorageProvider } from "../absStorageProvider"
import { STORAGE, StorageProvider, TStorageConfig } from "../StorageProvider"
import { TContext } from "../../@types/TContext"


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
    Config: TConfigSource = <TConfigSource>{}
    Connection?: absStorageProvider = undefined

    // FilesData
    ContentHandler: Record<string, absContentProvider> = {}     // Contents set in config
    File: Record<string, absContentProvider> = {}               // Files
    Lock: Map<string, Mutex> = new Map<string, Mutex>()         // Locker for exclusive access

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        Logger.Debug(`${Logger.Out} FilesData.Init`)
        this.SourceName = source
        this.Config = sourceConfig
        const {
            storage = STORAGE.FILESYSTEM,
            content
        } = this.Config.options as TFilesDataOptions

        if (content === undefined)
            throw new HttpErrorNotImplemented(`${this.SourceName}: Content type is not defined`)

        this.Connection = StorageProvider.GetProvider(storage)
        this.Connection.SetConfig(this.Config)

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
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        const { schema, entity } = schemaRequest

        this.SetContentHandler(entity)

        this.File[entity].InitContent(
            entity,
            await this.Connection.Read(entity)
        )

        // eslint-disable-next-line no-param-reassign
        $context = _.merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const data = await this.File[entity].Get(sqlQuery, $context)

        if (Logger.Level == VERBOSITY.DEBUG)
            data.SetMetaData("__DEBUG_SOURCE_OPTIONS__", this.Config.options)

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
    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)
        this.SetLock(entity)
        await this.Lock.get(entity)!.Acquire()

        try {
            this.File[entity].InitContent(
                entity,
                await this.Connection.Read(entity)
            )

            const data = await this.File[entity].Get(undefined, $context)

            const sqlQueryHelper = this.GenerateSqlInsert(schemaRequest, options)

            await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)
            await this.Connection.Write(
                entity,
                await this.File[entity].Set(data, $context)
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
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)
        this.SetLock(entity)
        await this.Lock.get(entity)!.Acquire()
        try {
            this.File[entity].InitContent(
                entity,
                await this.Connection.Read(entity)
            )

            const data = await this.File[entity].Get(undefined, $context)

            const sqlQueryHelper = this.GenerateSqlUpdate(schemaRequest, options)

            await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

            await this.Connection.Write(
                entity,
                await this.File[entity].Set(data, $context)
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
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)
        this.SetLock(entity)
        await this.Lock.get(entity)!.Acquire()

        try {
            this.File[entity].InitContent(
                entity,
                await this.Connection.Read(entity)
            )

            const data = await this.File[entity].Get(undefined, $context)

            const sqlQueryHelper = this.GenerateSqlDelete(schemaRequest, options)

            await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

            await this.Connection.Write(
                entity,
                await this.File[entity].Set(data, $context)
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
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {

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
