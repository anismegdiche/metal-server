//
//
//
//
//
import _ from "lodash"
//
import { RESPONSE } from "../../lib/Const"
import { Helper } from "../../lib/Helper"
import { Logger } from "../../utils/Logger"
import { SqlQueryHelper } from "../../lib/SqlQueryHelper"
import { Cache } from "../../server/Cache"
import DATA_PROVIDER from "../../server/Source"
import * as IDataProvider from "../../types/IDataProvider"
import { TOptions } from "../../types/TOptions"
import { TSchemaRequest } from "../../types/TSchemaRequest"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TConfigSource } from "../../types/TConfig"
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { IStorage } from "../../types/IStorage"
import { IContent } from "../../types/IContent"
import { HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { Convert } from "../../lib/Convert"
// Storage
import { AzureBlobStorage, TAzureBlobStorageConfig } from '../storage/AzureBlobStorage'
import { FsStorage, TFsStorageConfig } from '../storage/FsStorage'
import { FtpStorage, TFtpStorageConfig } from "../storage/FtpStorage"
import { SmbStorage, TSmbStorageConfig } from "../storage/SmbStorage"
// Content
import { JsonContent, TJsonContentConfig } from "../content/JsonContent"
import { CsvContent, TCsvContentConfig } from '../content/CsvContent'
import { TXlsContentConfig, XlsContent } from "../content/XlsContent"


export enum STORAGE {
    FILESYSTEM = "fs",
    AZURE_BLOB = "azureBlob",
    FTP = "ftp",
    SMB = "smb"
}

export enum CONTENT {
    JSON = "json",
    CSV = "csv",
    XLS = "xls"
}

export type TStorageConfig = TFsStorageConfig & TAzureBlobStorageConfig & TFtpStorageConfig & TSmbStorageConfig

export type TContentConfig = TJsonContentConfig & TCsvContentConfig & TXlsContentConfig

export type TFilesDataProviderOptions = {
    // Common
    storage?: STORAGE
    content?: {
        [pattern: string]: {
            type: CONTENT
        } & TContentConfig
    }

    //TODO: to test
    autoCreate?: boolean
}
    & TStorageConfig

export class FilesDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.FILES
    Connection?: IStorage = undefined
    SourceName: string
    Params: TConfigSource = <TConfigSource>{}

    // FilesDataProvider
    ContentHandler: Record<string, IContent> = {}
    Files: Record<string, IContent> = {}

    Options = new CommonSqlDataProviderOptions()

    //TODO: Refactor this asynchronous operation outside of the constructor.sonarlint(typescript:S7059)
    constructor(sourceName: string, sourceParams: TConfigSource) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static readonly #NewStorageCaseMap: Record<STORAGE, Function> = {
        [STORAGE.FILESYSTEM]: (storageParams: TConfigSource) => new FsStorage(storageParams),
        [STORAGE.AZURE_BLOB]: (storageParams: TConfigSource) => new AzureBlobStorage(storageParams),
        [STORAGE.FTP]: (storageParams: TConfigSource) => new FtpStorage(storageParams),
        [STORAGE.SMB]: (storageParams: TConfigSource) => new SmbStorage(storageParams)
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static readonly #NewContentCaseMap: Record<CONTENT, Function> = {
        [CONTENT.JSON]: (contentConfig: TContentConfig) => new JsonContent(contentConfig),
        [CONTENT.CSV]: (contentConfig: TContentConfig) => new CsvContent(contentConfig),
        [CONTENT.XLS]: (contentConfig: TContentConfig) => new XlsContent(contentConfig)
    }

    #SetHandler(entityName: string) {
        if (!_.has(this.Files, entityName)) {
            const handler = Object.keys(this.ContentHandler).find(pattern => Convert.PatternToRegex(pattern).test(entityName))
            if (handler)
                this.Files[entityName] = this.ContentHandler[handler]
            else
                throw new HttpErrorNotImplemented(`${this.SourceName}: No content handler found for entity ${entityName}`)
        }
    }

    @Logger.LogFunction()
    async Init(sourceParams: TConfigSource): Promise<void> {
        Logger.Debug("FilesDataProvider.Init")
        this.Params = sourceParams
        const {
            storage = STORAGE.FILESYSTEM,
            content
        } = this.Params.options as TFilesDataProviderOptions

        if (content === undefined)
            throw new HttpErrorNotImplemented(`${this.SourceName}: Content type is not defined`)

        this.Connection = FilesDataProvider.#NewStorageCaseMap[storage](this.Params) ?? Helper.CaseMapNotFound(storage)

        // init storage
        if (this.Connection)
            this.Connection.Init()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize storage provider`)

        // init content
        for (const filePattern in content) {
            if (Object.prototype.hasOwnProperty.call(content, filePattern)) {
                const { type } = content[filePattern]
                this.ContentHandler[filePattern] =
                    FilesDataProvider.#NewContentCaseMap[type](content[filePattern])
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
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entityName } = schemaRequest

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.#SetHandler(entityName)

        this.Files[entityName].Init(
            entityName,
            await this.Connection.Read(entityName)
        )

        const data = await this.Files[entityName].Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Insert(`\`${entityName}\``)
            .Fields(options.Data.GetFieldNames(), '`')
            .Values(options.Data.Rows)

        await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)
        await this.Connection.Write(
            entityName,
            await this.Files[entityName].Set(data)
        )

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schema, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schema,
            entityName
        }

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.#SetHandler(entityName)

        this.Files[entityName].Init(
            entityName,
            await this.Connection.Read(entityName)
        )

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entityName}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined)
            ? sqlQueryHelper.Query
            : undefined

        const data = await this.Files[entityName].Get(sqlQuery)

        if (options?.Cache)
            await Cache.Set({
                  ...schemaRequest,
                  sourceName: this.SourceName
              },
              data
            )

        return HttpResponse.Ok(<TSchemaResponse>{
            ...schemaResponse,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entityName } = schemaRequest

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.#SetHandler(entityName)

        this.Files[entityName].Init(
            entityName,
            await this.Connection.Read(entityName)
        )

        const data = await this.Files[entityName].Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`\`${entityName}\``)
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

        await this.Connection.Write(
            entityName,
            await this.Files[entityName].Set(data)
        )

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entityName } = schemaRequest


        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.#SetHandler(entityName)

        this.Files[entityName].Init(
            entityName,
            await this.Connection.Read(entityName)
        )

        const data = await this.Files[entityName].Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`\`${entityName}\``)
            .Where(options.Filter)

        await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

        await this.Connection.Write(
            entityName,
            await this.Files[entityName].Set(data)
        )

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
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

        // eslint-disable-next-line init-declarations
        let data: DataTable

        if (this.Connection)
            data = await this.Connection.List()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

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
