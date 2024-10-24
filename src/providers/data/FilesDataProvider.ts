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
import { TJson } from "../../types/TJson"
import { DataTable } from "../../types/DataTable"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { TXlsContentConfig, XlsContent } from "../content/XlsContent"


export enum STORAGE_PROVIDER {
    FILESYSTEM = "fileSystem",
    AZURE_BLOB = "azureBlob"
}

export enum CONTENT {
    JSON = "json",
    CSV = "csv",
    XLS = "xls"
}

export type TFilesDataProviderOptions = {
    // Common
    storageType?: STORAGE_PROVIDER
    contentType?: CONTENT
    //TODO: to test
    autoCreate?: boolean
}
    // Storage
    & TFsStorageConfig
    & TAzureBlobStorageConfig

    // Content
    & TJsonContentConfig
    & TCsvContentConfig
    & TXlsContentConfig

export class FilesDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.FILES
    Connection?: IStorageProvider = undefined
    Content: IContent = <IContent>{}
    ContentType: CONTENT = CONTENT.JSON
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Config: TJson = {}

    // FilesDataProvider
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
        [CONTENT.JSON]: (sourceParams: TSourceParams) => new JsonContent(sourceParams),
        [CONTENT.CSV]: (sourceParams: TSourceParams) => new CsvContent(sourceParams),
        [CONTENT.XLS]: (sourceParams: TSourceParams) => new XlsContent(sourceParams)
    }

    @Logger.LogFunction()
    async Init(sourceParams: TSourceParams): Promise<void> {
        Logger.Debug("FilesDataProvider.Init")
        this.Params = sourceParams
        const {
            storageType = STORAGE_PROVIDER.FILESYSTEM,
            contentType = CONTENT.JSON
        } = this.Params.options as TFilesDataProviderOptions

        this.Connection = FilesDataProvider.#NewStorageCaseMap[storageType](this.Params) ?? Helper.CaseMapNotFound(storageType)

        if (this.Connection)
            this.Connection?.Init()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize storage provider`)

        this.Content = FilesDataProvider.#NewContentCaseMap[contentType](this.Params) ?? Helper.CaseMapNotFound(contentType)
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (this.Connection && this.Content)
            this.Connection.Connect()
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        if (this.Connection && this.Content)
            this.Connection.Disconnect()
    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entityName } = schemaRequest

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in storage provider`)

        if (!_.has(this.File, entityName))
            this.File[entityName] = this.Content

        this.File[entityName].Init(
            entityName,
            await this.Connection?.Read(entityName)
        )

        const data = await this.File[entityName].Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Insert(`\`${entityName}\``)
            .Fields(options.Data.GetFieldNames(), '`')
            .Values(options.Data.Rows)

        await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)
        await this.Connection?.Write(
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

        if (!_.has(this.File, entityName))
            this.File[entityName] = this.Content

        this.File[entityName].Init(
            entityName,
            await this.Connection?.Read(entityName)
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

        if (!_.has(this.File, entityName))
            this.File[entityName] = this.Content

        this.File[entityName].Init(
            entityName,
            await this.Connection?.Read(entityName)
        )

        const data = await this.File[entityName].Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`\`${entityName}\``)
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

        await this.Connection?.Write(
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

        if (!_.has(this.File, entityName))
            this.File[entityName] = this.Content

        this.File[entityName].Init(
            entityName,
            await this.Connection?.Read(entityName)
        )

        const data = await this.File[entityName].Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`\`${entityName}\``)
            .Where(options.Filter)

        await data.FreeSqlAsync(sqlQueryHelper.Query, sqlQueryHelper.Data)

        await this.Connection?.Write(
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
