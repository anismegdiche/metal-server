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
import { TSourceParams } from "../../types/TSourceParams"
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { IStorageProvider } from "../../types/IStorageProvider"
import { IContent } from "../../types/IContent"
import { JsonContent, TJsonContentConfig } from "../content/JsonContent"
import { AzureBlobStorage, TAzureBlobStorageConfig } from '../storage/AzureBlobStorage'
import { FsStorage, TFsStorageConfig } from '../storage/FsStorage'
import { CsvContent, TCsvContentConfig } from '../content/CsvContent'
import { HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { TXlsContentConfig, XlsContent } from "../content/XlsContent"
import { Convert } from "../../lib/Convert"


export enum STORAGE_PROVIDER {
    FILESYSTEM = "fs",
    AZURE_BLOB = "azureBlob"
}

export enum CONTENT {
    JSON = "json",
    CSV = "csv",
    XLS = "xls"
}

export type TStorageConfig = TFsStorageConfig & TAzureBlobStorageConfig

export type TContentConfig = TJsonContentConfig & TCsvContentConfig & TXlsContentConfig

export type TFilesDataProviderOptions = {
    // Common
    storageType?: STORAGE_PROVIDER
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
    Connection?: IStorageProvider = undefined
    //XXX ContentType: CONTENT = CONTENT.JSON
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    //XXX Config: TJson = {}

    // FilesDataProvider
    ContentHandler: Record<string, IContent> = {}
    File: Record<string, IContent> = {}

    Options = new CommonSqlDataProviderOptions()

    //TODO: Refactor this asynchronous operation outside of the constructor.sonarlint(typescript:S7059)
    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static readonly #NewStorageCaseMap: Record<STORAGE_PROVIDER, Function> = {
        [STORAGE_PROVIDER.FILESYSTEM]: (storageParams: TSourceParams) => new FsStorage(storageParams),
        [STORAGE_PROVIDER.AZURE_BLOB]: (storageParams: TSourceParams) => new AzureBlobStorage(storageParams)
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static readonly #NewContentCaseMap: Record<CONTENT, Function> = {
        [CONTENT.JSON]: (contentConfig: TContentConfig) => new JsonContent(contentConfig),
        [CONTENT.CSV]: (contentConfig: TContentConfig) => new CsvContent(contentConfig),
        [CONTENT.XLS]: (contentConfig: TContentConfig) => new XlsContent(contentConfig)
    }

    #SetHandler(entityName: string) {
        if (!_.has(this.File, entityName)) {
            const handler = Object.keys(this.ContentHandler).find(pattern => Convert.ConvertPatternToRegex(pattern).test(entityName))
            if (handler)
                this.File[entityName] = this.ContentHandler[handler]
            else
                throw new HttpErrorNotImplemented(`${this.SourceName}: No content handler found for entity ${entityName}`)
        }
    }

    @Logger.LogFunction()
    async Init(sourceParams: TSourceParams): Promise<void> {
        Logger.Debug("FilesDataProvider.Init")
        this.Params = sourceParams
        const {
            storageType = STORAGE_PROVIDER.FILESYSTEM,
            content
        } = this.Params.options as TFilesDataProviderOptions

        if (content === undefined)
            throw new HttpErrorNotImplemented(`${this.SourceName}: Content type is not defined`)

        this.Connection = FilesDataProvider.#NewStorageCaseMap[storageType](this.Params) ?? Helper.CaseMapNotFound(storageType)

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
        if (this.Connection && this.ContentHandler)
            this.Connection.Connect()
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        if (this.Connection && this.ContentHandler)
            this.Connection.Disconnect()
    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entityName } = schemaRequest

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.#SetHandler(entityName)

        this.File[entityName].Init(
            entityName,
            await this.Connection.Read(entityName)
        )

        const data = await this.File[entityName].Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Insert(`\`${entityName}\``)
            .Fields(options.Data.GetFieldNames(), '`')
            .Values(options.Data.Rows)

        await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)
        await this.Connection.Write(
            entityName,
            await this.File[entityName].Set(data)
        )

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName
        }

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        this.#SetHandler(entityName)

        this.File[entityName].Init(
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

        const data = await this.File[entityName].Get(sqlQuery)

        if (options?.Cache)
            Cache.Set({
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

        this.File[entityName].Init(
            entityName,
            await this.Connection.Read(entityName)
        )

        const data = await this.File[entityName].Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`\`${entityName}\``)
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

        await this.Connection.Write(
            entityName,
            await this.File[entityName].Set(data)
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

        this.File[entityName].Init(
            entityName,
            await this.Connection.Read(entityName)
        )

        const data = await this.File[entityName].Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`\`${entityName}\``)
            .Where(options.Filter)

        await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

        await this.Connection.Write(
            entityName,
            await this.File[entityName].Set(data)
        )

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const { schemaName } = schemaRequest

        // eslint-disable-next-line init-declarations
        let data: DataTable

        if (this.Connection)
            data = await this.Connection.List()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        if (data.Rows.length == 0)
            throw new HttpErrorNotFound(`${schemaName}: No entities found`)

        return HttpResponse.Ok(<TSchemaResponse>{
            schemaName,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }
}
