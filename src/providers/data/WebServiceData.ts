//
//
//
//
//
import _ from "lodash"
import { tags } from "typia"
//
import { TConfigSource } from "../../types/TConfig"
import { TInternalResponse } from "../../types/TInternalResponse"
import { TSchemaRequest, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate, TSchemaRequestDelete } from "../../types/TSchemaRequest"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { absDataProvider } from "../absDataProvider"
import { CONTENT, ContentProvider, TContentConfig } from "../ContentProvider"
import { DATA_PROVIDER } from "../DataProvider"
import { absContentProvider } from "../absContentProvider"
import { HttpErrorInternalServerError, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { Logger, VERBOSITY } from "../../utils/Logger"
import { TWebServiceConfig, WEBSERVICE, WebServiceProvider } from "../WebServiceProvider"
import { absWebServiceProvider } from "../absWebServiceProvider"
import { TOptions } from "../../types/TOptions"
import { RESPONSE } from "../../lib/Const"
import { SqlQueryHelper } from "../../lib/SqlQueryHelper"
import { HttpResponse } from "../../server/HttpResponse"
import { Cache } from "../../server/Cache"
import { ENDPOINT } from "../webservice/RestWebService"
import { TJson } from "../../types/TJson"
import { JsonHelper } from "../../lib/JsonHelper"


//
export type TConfigSourceWebServiceOptions = {
    type: WEBSERVICE
    content: CONTENT
}
    & TContentConfig
    & TWebServiceConfig

export type TConfigSourceWebService = {
    provider: DATA_PROVIDER.WEBSERVICE
    host: string & tags.Format<"url">
    options: TConfigSourceWebServiceOptions
}


//
export class WebServiceData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.WEBSERVICE
    Params: TConfigSourceWebService | undefined
    Connection?: absWebServiceProvider

    // WebServiceData
    ContentHandler?: absContentProvider     // Content set in config file
    File = new Map<string, absContentProvider>()               // Files
    Lock = new Map<string, Mutex>()

    constructor() {
        super()
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return `\`${entity}\``
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return `\`${field}\``
    }


    @Logger.LogFunction(Logger.Debug, true)
    Init(source: string, sourceParams: TConfigSource): void {
        this.SourceName = source
        this.Params = _.merge(this.Params, sourceParams)
        //
        const { content, type: webservice } = this.Params.options

        if (content === undefined)
            throw new HttpErrorNotImplemented(`${this.SourceName}: Content type is not defined`)

        this.Connection = WebServiceProvider.GetProvider(webservice)
        this.Connection.SetConfig(this.Params)

        // init webservice
        if (this.Connection)
            this.Connection.Init()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize webservice provider`)

        // init content
        this.ContentHandler = ContentProvider.GetProvider(content)
        this.ContentHandler.SetConfig(this.Params.options)
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        try {
            if (this.Connection && this.ContentHandler) {
                this.Connection.Connect()
                Logger.Debug(`${Logger.Out} WebService provider '${this.SourceName}' connected`)
            }
        } catch (error: any) {
            Logger.Error(`${this.SourceName}: Failed to connect to WebService provider: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        try {
            if (this.Connection && this.ContentHandler)
                await this.Connection.Disconnect()
        } catch (error: any) {
            Logger.Error(`${this.SourceName}: Failed to disconnect in WebService provider: ${error.message}`)
        }
    }

    // eslint-disable-next-line class-methods-use-this
    ListEntities(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        throw new HttpErrorNotImplemented()
    }

    // eslint-disable-next-line class-methods-use-this
    AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

     
    async Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>> {


        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entity } = schemaRequest

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

        this.SetContentHandler(entity)

        await Promise.all(options.Data.Rows.map((data: TJson) => this.Connection!.Create(
            entity,
            JsonHelper.Stringify(data)
        )))

        // clean cache
        Cache.Remove(schemaRequest)
        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequestSelect): Promise<TInternalResponse<TSchemaResponse>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schema, entity } = schemaRequest

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

        this.SetContentHandler(entity)

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read(entity)
        )

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entity}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const data = await this.File.get(entity)!.Get(sqlQuery)

        if (Logger.Level == VERBOSITY.DEBUG)
            data.SetMetaData("__CONTENT_DEBUG__", this.File.get(entity)!.GetConfig())

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
    async Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entity } = schemaRequest
        const keyName = this.Connection!.GetKeyName(ENDPOINT.ITEM_UPDATE)

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

        if (!keyName)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid KeyName in WebService provider`)

        this.SetContentHandler(entity)

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read(entity)
        )

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(keyName)
            .From(`\`${entity}\``)
            .Where(options.Filter)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const keysCollection = await this.File.get(entity)!.Get(sqlQuery)

        await Promise.all(keysCollection.Rows.map((row: TJson) => {
            const data = Array.isArray(options.Data.Rows)
                ? options.Data.Rows[0]
                : options.Data.Rows

            return this.Connection!.Update(
                entity,
                row[keyName] as string,
                JsonHelper.Stringify(data)
            )
        }))

        // clean cache
        Cache.Remove(schemaRequest)
        return HttpResponse.NoContent()
    }
     
    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { entity } = schemaRequest
        const keyName = this.Connection!.GetKeyName(ENDPOINT.ITEM_DELETE)

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

        if (!keyName)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid KeyName in WebService provider`)

        this.SetContentHandler(entity)

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read(entity)
        )

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(keyName)
            .From(`\`${entity}\``)
            .Where(options.Filter)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const keysCollection = await this.File.get(entity)!.Get(sqlQuery)

        await Promise.all(keysCollection.Rows.map((row: TJson) => this.Connection!.Delete(
            entity,
            row[keyName] as string
        )))

        // clean cache
        Cache.Remove(schemaRequest)
        return HttpResponse.NoContent()
    }

    // WebServiceData

    SetContentHandler(entity: string) {
        if (!this.File.has(entity) && this.ContentHandler)
            this.File.set(entity, this.ContentHandler)
    }

    SetLock(entity: string) {
        if (!this.Lock.has(entity))
            this.Lock.set(entity, new Mutex())
    }
}    