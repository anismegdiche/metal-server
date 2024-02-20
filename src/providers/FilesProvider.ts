/* eslint-disable init-declarations */
//
//
//
//
//
import { RESPONSE_TRANSACTION, RESPONSE } from "../lib/Const"
import { Helper } from "../lib/Helper"
import { Logger } from "../lib/Logger"
import { SqlQueryHelper } from "../lib/SqlQueryHelper"
import { Cache } from "../server/Cache"
import PROVIDER from "../server/Source"
import * as IProvider from "../types/IProvider"
import { TOptions } from "../types/TOptions"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../types/TSchemaResponse"
import { TSourceParams } from "../types/TSourceParams"
import { CommonSqlProviderOptions } from "./CommonSqlProvider"
import { IStorage } from "./storage/CommonStorage"
import { IContent } from "./content/CommonContent"
import { JsonContent } from "./content/JsonContent"
import { AzureBlobStorage } from './storage/AzureBlobStorage'
import { FsStorage } from './storage/FsStorage'
import { CsvContent } from './content/CsvContent'

/* eslint-disable no-unused-vars */
export enum STORAGE {
    FILESYSTEM = "filesystem",
    AZURE_BLOB = "azureblob"
}

export enum CONTENT {
    JSON = "json",
    CSV = "csv"
}
/* eslint-enable no-unused-vars */

export type TFileProviderOptions = {
    // Common
    storageType?: STORAGE
    contentType?: CONTENT
    autoCreate?: boolean
} &
{    // Filesystem
    fsFolder?: string
} &
{    // Azure Blob
    azureBlobConnectionString?: string
    azureBlobContainerName?: string
    azureBlobCreateContainerIfNotExists?: boolean
} &
{    // JSON
    jsonArrayPath?: string
} &
{    // CSV
    csvDelimiter?: string
    csvNewline?: string
    csvHeader?: boolean
    csvQuoteChar?: string
    csvSkipEmptyLines?: string | boolean
}

export class FilesProvider implements IProvider.IProvider {
    ProviderName = PROVIDER.FILES
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Primitive: IStorage = <IStorage>{}
    Content: IContent = <IContent>{}
    ContentType: CONTENT = CONTENT.JSON

    Options = new CommonSqlProviderOptions()

    static #NewStorageCaseMap: Record<STORAGE, Function> = {
        [STORAGE.FILESYSTEM]: (storageParams: TSourceParams) => new FsStorage(storageParams),
        [STORAGE.AZURE_BLOB]: (storageParams: TSourceParams) => new AzureBlobStorage(storageParams)
    }

    static #NewContentCaseMap: Record<CONTENT, Function> = {
        [CONTENT.JSON]: (sourceParams: TSourceParams) => new JsonContent(sourceParams),
        [CONTENT.CSV]: (sourceParams: TSourceParams) => new CsvContent(sourceParams)
    }

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    async Init(sourceParams: TSourceParams): Promise<void> {
        Logger.Debug("FilesProvider.Init")
        this.Params = sourceParams
        const {
            storageType = STORAGE.FILESYSTEM,
            contentType = CONTENT.JSON
        } = this.Params.options as TFileProviderOptions

        this.Primitive = FilesProvider.#NewStorageCaseMap[storageType](this.Params) || Helper.CaseMapNotFound(storageType)

        if (this.Primitive)
            this.Primitive.Init()
        else
            throw new Error(`${this.SourceName}: Failed to initialize storage provider`)

        this.Content = FilesProvider.#NewContentCaseMap[contentType](this.Params) || Helper.CaseMapNotFound(contentType)
    }

    async Connect(): Promise<void> {
        if (this.Primitive && this.Content) {
            this.Primitive.Connect()
        }
    }

    async Disconnect(): Promise<void> {
        if (this.Primitive && this.Content) {
            this.Primitive.Disconnect()
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} FilesProvider.Insert: ${JSON.stringify(schemaRequest)}`)

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.INSERT
        }

        let fileString
        if (this.Primitive)
            fileString = await this.Primitive.Read(entityName)
        else
            throw new Error(`${this.SourceName}: Failed to read in storage provider`)

        if (!fileString) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        this.Content.Init(entityName, fileString)
        const fileDataTable = await this.Content.Get() || undefined

        const sqlQuery = new SqlQueryHelper()
            .Insert(`\`${entityName}\``)
            .Fields(options.Data.GetFieldNames())
            .Values(options.Data.Rows)
            .Query

        await fileDataTable.FreeSql(sqlQuery)
        fileString = await this.Content.Set(fileDataTable)
        await this.Primitive.Write(entityName, fileString)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} FilesProvider.Select: ${JSON.stringify(schemaRequest)}`)
        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.SELECT
        }

        let fileString
        if (this.Primitive)
            fileString = await this.Primitive.Read(entityName)
        else
            throw new Error(`${this.SourceName}: Failed to read in storage provider`)

        if (!fileString) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        this.Content.Init(entityName, fileString)

        const sqlQuery = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entityName}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)
            .Query

        const fileDataTable = await this.Content.Get(sqlQuery) || undefined

        if (fileDataTable && fileDataTable.Rows.length > 0) {
            Cache.Set({
                ...schemaRequest,
                sourceName: this.SourceName
            },
                fileDataTable
            )
            return <TSchemaResponseData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: fileDataTable
            }
        } else {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
    }

    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} FilesProvider.Update: ${JSON.stringify(schemaRequest)}`)
        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        let fileString
        if (this.Primitive)
            fileString = await this.Primitive.Read(entityName)
        else
            throw new Error(`${this.SourceName}: Failed to read in storage provider`)

        if (!fileString) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        this.Content.Init(entityName, fileString)
        const fileDataTable = await this.Content.Get() || undefined

        const sqlQuery = new SqlQueryHelper()
            .Update(`\`${entityName}\``)
            .Set(options.Data.Rows)
            .Where(options.Filter)
            .Query

        await fileDataTable.FreeSql(sqlQuery)
        fileString = await this.Content.Set(fileDataTable)
        await this.Primitive.Write(entityName, fileString)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} FilesProvider.Delete: ${JSON.stringify(schemaRequest)}`)

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.DELETE
        }

        let fileString
        if (this.Primitive)
            fileString = await this.Primitive.Read(entityName)
        else
            throw new Error(`${this.SourceName}: Failed to read in storage provider`)

        if (!fileString) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        this.Content.Init(entityName, fileString)
        const fileDataTable = await this.Content.Get() || undefined

        const sqlQuery = new SqlQueryHelper()
            .Delete()
            .From(`\`${entityName}\``)
            .Where(options.Filter)
            .Query

        await fileDataTable.FreeSql(sqlQuery)
        fileString = await this.Content.Set(fileDataTable)

        if (this.Primitive)
            await this.Primitive.Write(entityName, fileString)
        else
            throw new Error(`${this.SourceName}: Failed to write in storage provider`)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
    }
}
