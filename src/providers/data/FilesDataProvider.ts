/* eslint-disable init-declarations */
//
//
//
//
//
import { RESPONSE_TRANSACTION, RESPONSE } from "../../lib/Const"
import { Helper } from "../../lib/Helper"
import { Logger } from "../../lib/Logger"
import { SqlQueryHelper } from "../../lib/SqlQueryHelper"
import { Cache } from "../../server/Cache"
import DATA_PROVIDER from "../../server/Source"
import * as IDataProvider from "../../types/IDataProvider"
import { TOptions } from "../../types/TOptions"
import { TSchemaRequest } from "../../types/TSchemaRequest"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../../types/TSchemaResponse"
import { TSourceParams } from "../../types/TSourceParams"
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { IStorage } from "../storage/CommonStorage"
import { IContent } from "../content/CommonContent"
import { JsonContent } from "../content/JsonContent"
import { AzureBlobStorage } from '../storage/AzureBlobStorage'
import { FsStorage } from '../storage/FsStorage'
import { CsvContent } from '../content/CsvContent'

/* eslint-disable no-unused-vars */
export enum STORAGE_PROVIDER {
    FILESYSTEM = "fileSystem",
    AZURE_BLOB = "azureBlob"
}

export enum CONTENT {
    JSON = "json",
    CSV = "csv"
}
/* eslint-enable no-unused-vars */

export type TFilesDataProviderOptions = {
    // Common
    storageType?: STORAGE_PROVIDER
    contentType?: CONTENT
    //TODO: to test
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

export class FilesDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.FILES
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Connection?: IStorage = undefined
    Content: IContent = <IContent>{}
    ContentType: CONTENT = CONTENT.JSON

    Options = new CommonSqlDataProviderOptions()

    static #NewStorageCaseMap: Record<STORAGE_PROVIDER, Function> = {
        [STORAGE_PROVIDER.FILESYSTEM]: (storageParams: TSourceParams) => new FsStorage(storageParams),
        [STORAGE_PROVIDER.AZURE_BLOB]: (storageParams: TSourceParams) => new AzureBlobStorage(storageParams)
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
            throw new Error(`${this.SourceName}: Failed to initialize storage provider`)

        this.Content = FilesDataProvider.#NewContentCaseMap[contentType](this.Params) ?? Helper.CaseMapNotFound(contentType)
    }

    async Connect(): Promise<void> {
        if (this.Connection && this.Content) {
            this.Connection.Connect()
        }
    }

    async Disconnect(): Promise<void> {
        if (this.Connection && this.Content) {
            this.Connection.Disconnect()
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} FilesDataProvider.Insert: ${JSON.stringify(schemaRequest)}`)

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.INSERT
        }

        let fileString
        if (this.Connection)
            fileString = await this.Connection?.Read(entityName)
        else
            throw new Error(`${this.SourceName}: Failed to read in storage provider`)

        if (fileString == undefined) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }

        this.Content.Init(entityName, fileString)
        const fileDataTable = await this.Content.Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Insert(`\`${entityName}\``)
            .Fields(options.Data.GetFieldNames(), '`')
            .Values(options.Data.Rows)

        await fileDataTable.FreeSql(sqlQueryHelper.Query, sqlQueryHelper.Data)
        fileString = await this.Content.Set(fileDataTable)
        await this.Connection?.Write(entityName, fileString)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} FilesDataProvider.Select: ${JSON.stringify(schemaRequest)}`)
        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.SELECT
        }

        let fileString
        if (this.Connection)
            fileString = await this.Connection?.Read(entityName)
        else
            throw new Error(`${this.SourceName}: Failed to read in storage provider`)

        if (fileString == undefined) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        this.Content.Init(entityName, fileString)
        
        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entityName}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined)
            ? sqlQueryHelper.Query
            : undefined

        const fileDataTable = await this.Content.Get(sqlQuery)

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
        Logger.Debug(`${Logger.In} FilesDataProvider.Update: ${JSON.stringify(schemaRequest)}`)
        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        let fileString
        if (this.Connection)
            fileString = await this.Connection?.Read(entityName)
        else
            throw new Error(`${this.SourceName}: Failed to read in storage provider`)

        if (fileString == undefined) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        this.Content.Init(entityName, fileString)
        const fileDataTable = await this.Content.Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Update(`\`${entityName}\``)
            .Set(options.Data.Rows)
            .Where(options.Filter)

        await fileDataTable.FreeSql(sqlQueryHelper.Query, sqlQueryHelper.Data)
        fileString = await this.Content.Set(fileDataTable)
        await this.Connection?.Write(entityName, fileString)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} FilesDataProvider.Delete: ${JSON.stringify(schemaRequest)}`)

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.DELETE
        }

        let fileString
        if (this.Connection)
            fileString = await this.Connection?.Read(entityName)
        else
            throw new Error(`${this.SourceName}: Failed to read in storage provider`)

        if (fileString == undefined) {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        this.Content.Init(entityName, fileString)
        const fileDataTable = await this.Content.Get()

        const sqlQueryHelper = new SqlQueryHelper()
            .Delete()
            .From(`\`${entityName}\``)
            .Where(options.Filter)

        await fileDataTable.FreeSql(sqlQueryHelper.Query, sqlQueryHelper.Data)
        fileString = await this.Content.Set(fileDataTable)

        if (this.Connection)
            await this.Connection?.Write(entityName, fileString)
        else
            throw new Error(`${this.SourceName}: Failed to write in storage provider`)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
    }
}
