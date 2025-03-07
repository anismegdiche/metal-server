//
//
//
//
import _ from "lodash"
import typia from "typia"
//
import { TConfigSource } from "../../types/TConfig"
import { TInternalResponse } from "../../types/TInternalResponse"
import { TSchemaRequest, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate, TSchemaRequestDelete, TSchemaRequestListEntities } from "../../types/TSchemaRequest"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { absDataProvider } from "../absDataProvider"
import { CONTENT, ContentProvider, TContentConfig } from "../ContentProvider"
import { DATA_PROVIDER } from "../DataProvider"
import { absContentProvider } from "../absContentProvider"
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { Logger, VERBOSITY } from "../../utils/Logger"
import { WEBSERVICE, WebServiceProvider } from "../WebServiceProvider"
import { absWebServiceProvider, ENDPOINT, TEndpoint, TWebServiceEndpoint } from "../absWebServiceProvider"
import { TOptionalParameter } from "../../types/TOptionalParameter"
import { RESPONSE } from "../../lib/Const"
import { HttpResponse } from "../../server/HttpResponse"
import { Cache } from "../../server/Cache"
import { TJson } from "../../types/TJson"
import { DataTable } from "../../types/DataTable"
import { TContext } from "../../@types/TContext"
import { TUrl } from "../../@types/TUrl"
import { SynchronizerManager } from "../../utils/SynchronizerManager"


//
export type TWebServiceDataOptions = {
    type: WEBSERVICE
    content: CONTENT
    endpoints: {
        [ENDPOINT.SESSION]?: TWebServiceEndpoint
        [ENDPOINT.COLLECTION_READ]: TWebServiceEndpoint
        [ENDPOINT.COLLECTION_CREATE]?: TWebServiceEndpoint
        [ENDPOINT.COLLECTION_UPDATE]?: TWebServiceEndpoint
        [ENDPOINT.COLLECTION_DELETE]?: TWebServiceEndpoint
        [ENDPOINT.COLLECTION_LIST]?: TWebServiceEndpoint
        [ENDPOINT.ITEM_READ]?: TWebServiceEndpoint
        [ENDPOINT.ITEM_CREATE]?: TWebServiceEndpoint
        [ENDPOINT.ITEM_UPDATE]?: TWebServiceEndpoint
        [ENDPOINT.ITEM_DELETE]?: TWebServiceEndpoint
    }
}
    & TContentConfig

export type TConfigSourceWebService = {
    provider: DATA_PROVIDER.WEBSERVICE
    host: TUrl
    options: TWebServiceDataOptions
}


//
export class WebServiceData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.WEBSERVICE
    Config: TConfigSourceWebService | undefined
    Connection?: absWebServiceProvider

    // WebServiceData
    ContentHandler?: absContentProvider                 // Content set in config file
    File = new Map<string, absContentProvider>()        // Files

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
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        this.SourceName = source
        this.Config = _.merge(this.Config, sourceConfig)
        //
        const { content, type: webservice } = this.Config.options

        if (content === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Content type is not defined`)

        this.Connection = WebServiceProvider.GetProvider(webservice)
        this.Connection.SetConfig(this.Config)

        // init webservice
        if (this.Connection)
            await this.Connection.Init()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize webservice provider`)

        // init content
        this.ContentHandler = ContentProvider.GetProvider(content)
        this.ContentHandler.SetConfig(this.Config.options)
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        try {
            if (this.Connection && this.ContentHandler) {
                await this.Connection.Connect()
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
    ListEntities(_schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
        throw new HttpErrorNotImplemented()
    }

    // eslint-disable-next-line class-methods-use-this
    AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized()
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Connection failed in WebService provider`)

        const { schema, entity } = schemaRequest

        this.SetContentHandler(entity)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read($context)
        )

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const data = await this.File.get(entity)!.Get(sqlQuery, $context)

        if (Logger.Level == VERBOSITY.DEBUG)
            data.SetMetaData("__DEBUG_SOURCE_OPTIONS__", this.Config?.options)

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

    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!schemaRequest.data)
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Connection failed in WebService provider`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            {
                $options: options
            }
        )

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        await Promise.all(options.Data.Rows.map((row: TJson) => {

            // eslint-disable-next-line no-param-reassign
            $context = _.merge(
                $context,
                {
                    $row: row
                }
            )

            return this.Connection!.Create(
                row,
                $context
            )
        }))

        // clean cache
        Cache.Remove(schemaRequest)
        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!schemaRequest.data)
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Connection failed in WebService provider`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            {
                $options: options
            }
        )

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read($context)
        )

        const endpointUpdate = this.Connection.Endpoints.get(ENDPOINT.ITEM_UPDATE)

        if (!endpointUpdate || !typia.validateEquals<TEndpoint>(endpointUpdate))
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)


        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const keysCollection = await this.File.get(entity)!.Get(sqlQuery, $context)

        await Promise.all(keysCollection.Rows.map((row: TJson) => {
            if (!Array.isArray(options.Data?.Rows))
                return Promise.resolve()

            const mergedRow: TJson = _.merge(
                row,
                options.Data.Rows.at(0)
            )

            // eslint-disable-next-line no-param-reassign
            $context = _.merge(
                $context,
                {
                    $row: row
                }
            )

            return this.Connection!.Update(
                mergedRow,
                $context
            )
        }))

        // clean cache
        Cache.Remove(schemaRequest)
        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            {
                $options: options
            }
        )

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read($context)
        )

        const endpointDelete = this.Connection.Endpoints.get(ENDPOINT.ITEM_DELETE)

        if (!endpointDelete || !typia.validateEquals<TEndpoint>(endpointDelete))
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)


        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const keysCollection = await this.File.get(entity)!.Get(sqlQuery, $context)

        await Promise.all(keysCollection.Rows.map((row: TJson) => {
            // eslint-disable-next-line no-param-reassign
            $context = _.merge(
                $context,
                {
                    $row: row
                }
            )

            return this.Connection!.Delete($context)
        }))

        // clean cache
        Cache.Remove(schemaRequest)
        return HttpResponse.NoContent()
    }

    //
    // WebServiceData
    //

    SetContentHandler(entity: string) {
        if (!this.File.has(entity) && this.ContentHandler)
            this.File.set(entity, this.ContentHandler)
    }
}    