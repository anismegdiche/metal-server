//
//
//
import has from "lodash/has"
import merge from "lodash/merge"
import typia from "typia"
//
import { DataTable, TRowsCopyParams } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { Convert } from "../../../utils/Convert"
import { Logger, VERBOSITY } from "../../../utils/Logger"
import { Mutex } from "../../../utils/Mutex"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { Cache } from "../../cache/Cache"
import { IContentProvider } from "../../content/base/IContentProvider"
import { ContentProvider } from "../../content/ContentProvider"
import { RESPONSE } from "../../core/@consts"
import { HttpResponse } from "../../core/HttpResponse"
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../errors/HttpErrors"
import { TContext } from "../../sandbox/types/TContext"
import { TInternalResponse } from "../../schema/types/TInternalResponse"
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from "../../schema/types/TSchemaRequest"
import { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { STORAGE } from "../../storage/@consts"
import { absStorageProvider } from "../../storage/base/absStorageProvider"
import { StorageProvider } from "../../storage/StorageProvider"
import { DATA_PROVIDER } from "../@consts"
import { absDataProvider } from "../base/absDataProvider"
import { TConfigSource } from "../types/TConfigSource"
import { TOptionalParameter } from "../types/TOptionalParameter"
import { TStorageFilesDataOptions } from "../types/TStorageFilesDataOptions"
import { TStorageFilesDataOptionsContent } from "../types/TStorageFilesDataOptionsContent"


//
export class StorageFilesData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.STORAGE
    Config: TConfigSource = <TConfigSource>{}
    Connection?: absStorageProvider = undefined

    // FilesData
    ContentHandler: Record<string, IContentProvider> = {}     // Contents set in config
    File: Record<string, IContentProvider> = {}               // Files
    Lock: Map<string, Mutex> = new Map<string, Mutex>()         // Locker for exclusive access

    constructor() {
        super()
    }

    _setContentHandler(entity: string) {
        if (!has(this.File, entity)) {
            const handler = Object.keys(this.ContentHandler).find(pattern => Convert.PatternToRegex(pattern)?.test(entity))
            if (handler)
                this.File[entity] = this.ContentHandler[handler]
            else
                throw new HttpErrorNotImplemented(`${this.SourceName}: No content handler found for entity ${entity}`)
        }
    }

    _setLock(entity: string) {
        if (!this.Lock.has(entity))
            this.Lock.set(entity, new Mutex())
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        await super.Init(source, sourceConfig)
        this.Config = sourceConfig
        const {
            "storage-type": storage = STORAGE.FILESYSTEM,
            content
        } = this.Config.options as TStorageFilesDataOptions

        Assert.Var<TStorageFilesDataOptionsContent>(content, typia.is<TStorageFilesDataOptionsContent>(content), `${this.SourceName}: Content type is not defined`)

        this.Connection = await StorageProvider.GetProvider(storage)
        this.Connection.SetConfig(this.Config)

        // init storage
        Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)
        this.Connection.Init()

        // init content
        for (const filePattern in content) {
            if (Object.hasOwn(content, filePattern)) {
                const { "content-type": type } = content[filePattern]

                this.ContentHandler[filePattern] = await ContentProvider.GetProvider(type)
                this.ContentHandler[filePattern].SetConfig(content[filePattern])
            }
        }
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
    @SynchronizerManager.Synchronized()
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

        const { schema: dirName, entity: fileName } = schemaRequest

        this._setContentHandler(fileName)

        this.File[fileName].InitContent(
            fileName,
            await this.Connection.FileRead('', fileName)
        )


        $context = merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        //XXX const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        //XXX const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const data = await this.File[fileName].Get(
            <TRowsCopyParams>{
                fields: options.Fields,
                filter: options.Filter,
                sort: options.Sort
            },
            $context
        )

        if (Logger.Level == VERBOSITY.DEBUG)
            data.MetaDataSet("__DEBUG_SOURCE_OPTIONS__", this.Config.options)

        if (options?.Cache)
            await Cache.Set({
                ...schemaRequest,
                source: this.SourceName
            },
                data
            )

        return HttpResponse.Ok(<TSchemaResponse>{
            schema: dirName,
            entity: fileName,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    @Logger.LogFunction(true)
    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

        $context = merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        Assert.Var<DataTable>(options.Data,
            `${this.SourceName}: Data is not defined`,
            new HttpErrorBadRequest()
        )

        const { entity: fileName } = schemaRequest

        this._setContentHandler(fileName)
        this._setLock(fileName)
        await this.Lock.get(fileName)!.Acquire()

        try {
            this.File[fileName].InitContent(
                fileName,
                await this.Connection.FileRead('', fileName)
            )

            const data = await this.File[fileName].Get({}, $context)

            //XXX const sqlQueryHelper = await this.GenerateSqlInsert(schemaRequest, options)

            //XXX await data.FreeSql({ sqlQuery: sqlQueryHelper.Query(), queryParams: sqlQueryHelper.QueryParams })
            await data.RowsAdd(await options.Data.Rows())
            await this.Connection.FileWrite(
                '',
                fileName,
                await this.File[fileName].Set(data, $context)
            )

            // clean cache
            Cache.Remove(schemaRequest)
            return HttpResponse.Created()

        } catch (error: any) {
            throw new HttpErrorInternalServerError(`${this.SourceName}: ${error.message}`)
        } finally {
            this.Lock.get(fileName)!.Release()
        }
    }

    @Logger.LogFunction(true)
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

        $context = merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        Assert.Var<DataTable>(options.Data, `${this.SourceName}: Data is not defined`, new HttpErrorBadRequest())

        const { entity: fileName } = schemaRequest

        this._setContentHandler(fileName)
        this._setLock(fileName)
        await this.Lock.get(fileName)!.Acquire()

        try {
            this.File[fileName].InitContent(
                fileName,
                await this.Connection.FileRead('', fileName)
            )

            const data = await this.File[fileName].Get({}, $context)

            const sqlQueryHelper = await this.GenerateSqlUpdate(schemaRequest, options)

            await data.FreeSql({ sqlQuery: sqlQueryHelper.Query(), queryParams: sqlQueryHelper.QueryParams })

            await this.Connection.FileWrite(
                '',
                fileName,
                await this.File[fileName].Set(data, $context)
            )

            // clean cache
            Cache.Remove(schemaRequest)
            return HttpResponse.NoContent()

        } catch (error: any) {
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to update ${fileName} in storage provider: ${error.message}`)
        } finally {
            this.Lock.get(fileName)!.Release()
        }
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

        $context = merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const { entity: fileName } = schemaRequest

        this._setContentHandler(fileName)
        this._setLock(fileName)
        await this.Lock.get(fileName)!.Acquire()

        try {
            this.File[fileName].InitContent(
                fileName,
                await this.Connection.FileRead('', fileName)
            )

            const data = await this.File[fileName].Get({}, $context)

            const sqlQueryHelper = await this.GenerateSqlDelete(schemaRequest, options)

            await data.FreeSql({ sqlQuery: sqlQueryHelper.Query(), queryParams: sqlQueryHelper.QueryParams })

            await this.Connection.FileWrite(
                '',
                fileName,
                await this.File[fileName].Set(data, $context)
            )

            // clean cache
            Cache.Remove(schemaRequest)
            return HttpResponse.NoContent()

        } catch (error: any) {
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to update ${fileName} in storage provider: ${error.message}`)
        } finally {
            this.Lock.get(fileName)!.Release()
        }
    }


    @Logger.LogFunction()
    // eslint-disable-next-line unused-imports/no-unused-vars
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

        const { schema } = schemaRequest

        const rxFilePatterns = new RegExp(
            `(${Object.keys(this.ContentHandler)
                .map(filePattern => Convert.PatternToRegex(filePattern)
                    .toString()
                    .replace(/\//g, '')
                ).join('|')})`)

        const data = await this.Connection.FolderListFiles()
        await data.RowsSet(
            (await data.Rows()).filter(row => rxFilePatterns.test(row.name as string))
        )

        Assert.Condition(await data.Count() > 0, `${schema}: No entities found`, new HttpErrorNotFound())

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
            data
        })
    }


    EscapeEntity(entity: string): string {
        return `"${entity}"`
    }


    EscapeField(field: string): string {
        return `"${field}"`
    }
}
