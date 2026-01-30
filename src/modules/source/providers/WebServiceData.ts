//
//
//
//
import { merge } from 'lodash-es'
import { z_TEndpoint } from "../../../utils/Schemas"
//
import type { TConfigSource } from "../types/TConfigSource"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { TSchemaRequest, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate, TSchemaRequestDelete, TSchemaRequestListEntities } from "../../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { absDataProvider } from "../base/absDataProvider"
import { DATA_PROVIDER } from "../@consts"
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotImplemented } from "../../errors/HttpErrors"
import { Logger, VERBOSITY } from "../../../utils/Logger"
import type { TOptionalParameter } from "../types/TOptionalParameter"
import { RESPONSE } from "../../core/@consts"
import { HttpResponse } from "../../core/HttpResponse"
import { Cache } from "../../cache/Cache"
import type { TJson } from "../../../types/TJson"
import type { TContext } from "../../sandbox/types/TContext"
import type { TUrl } from "../../../types/TUrl"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { CONTENT } from "../../content/@consts"
import type { TContentConfig } from "../../content/@types"
import type { IContentProvider } from "../../content/base/IContentProvider"
import { ContentProvider } from "../../content/ContentProvider"
import { WEBSERVICE, ENDPOINT } from "../../webservice/@consts"
import type { TWebServiceEndpoint } from "../../webservice/@types"
import { absWebServiceProvider } from "../../webservice/base/absWebServiceProvider"
import { WebServiceProvider } from "../../webservice/WebServiceProvider"
import { DataTable, type TRowsCopyParams } from "../../../types/DataTable"


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
    ContentHandler?: IContentProvider                 // Content set in config file
    File = new Map<string, IContentProvider>()        // Files

    constructor() {
        super()
    }

    @Logger.LogFunction(['sourceConfig'])
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        await super.Init(source, sourceConfig)
        this.Config = merge(this.Config, sourceConfig)

        //
        const { content, type: webservice } = this.Config.options

        if (content === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Content type is not defined`)

        this.Connection = await WebServiceProvider.GetProvider(webservice)
        this.Connection.SetConfig(this.Config)

        // init webservice
        if (this.Connection)
            await this.Connection.Init()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize webservice provider`)

        // init content

        this.ContentHandler = await ContentProvider.GetProvider(content)
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

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized()
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Connection failed in WebService provider`)

        const { schema, entity } = schemaRequest

        this.SetContentHandler(entity)


        $context = merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read($context)
        )

        const data = await this.File.get(entity)!.Get(
            <TRowsCopyParams>{
                fields: options.Fields,
                filter: options.Filter,
                sort: options.Sort
            },
            $context
        )

        if (Logger.Level == VERBOSITY.DEBUG)
            data.MetaDataSet("__DEBUG_SOURCE_OPTIONS__", this.Config?.options)

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

        if (!schemaRequest.data)
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Connection failed in WebService provider`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)


        $context = merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)


        $context = merge(
            $context,
            {
                $options: options
            }
        )

        if (!DataTable.Is(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        return options.Data.ForEach(
            async (row: TJson) => {
                $context = merge(
                    $context,
                    {
                        $row: row
                    }
                )

                return this.Connection!.Create(
                    row,
                    $context
                )
            }
        )
            .then(() => Cache.Remove(schemaRequest))
            .then(() => HttpResponse.Created())
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!schemaRequest.data)
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Connection failed in WebService provider`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)


        $context = merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)


        $context = merge(
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

        if (!endpointUpdate || !z_TEndpoint.safeParse(endpointUpdate).success)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        using keysCollection = await this.File.get(entity)!.Get(
            <TRowsCopyParams>{
                fields: options.Fields,
                filter: options.Filter,
                sort: options.Sort
            },
            $context
        )

        return keysCollection.ForEach(
            async (row: TJson) => {
                if (!Array.isArray(await options.Data?.Rows()))
                    return Promise.resolve()

                const mergedRow: TJson = merge(
                    row,
                    await options.Data?.Row(0)
                )

                $context = merge(
                    $context,
                    {
                        $row: row
                    }
                )

                return this.Connection!.Update(
                    mergedRow,
                    $context
                )
            }
        )
            .then(() => Cache.Remove(schemaRequest))
            .then(() => HttpResponse.NoContent())
    }


    @Logger.LogFunction()
    ListEntities(_schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
        throw new HttpErrorNotImplemented()
    }


    @Logger.LogFunction()
    AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)


        $context = merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)


        $context = merge(
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

        if (!endpointDelete || !z_TEndpoint.safeParse(endpointDelete).success)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        using keysCollection = await this.File.get(entity)!.Get(
            <TRowsCopyParams>{
                fields: options.Fields,
                filter: options.Filter,
                sort: options.Sort
            },
            $context
        )

        return keysCollection.ForEach(
            async (row: TJson) => {
                $context = merge(
                    $context,
                    {
                        $row: row
                    }
                )
                this.Connection!.Delete($context)
            }
        )
            .then(() => Cache.Remove(schemaRequest))
            .then(() => HttpResponse.NoContent())
    }


    EscapeEntity(entity: string): string {
        return `"${entity}"`
    }


    EscapeField(field: string): string {
        return `"${field}"`
    }

    //
    // WebServiceData
    //

    SetContentHandler(entity: string) {
        if (!this.File.has(entity) && this.ContentHandler)
            this.File.set(entity, this.ContentHandler)
    }
}    