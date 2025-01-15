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
import { TConfigWebServiceOptions, WEBSERVICE, WebServiceProvider } from "../WebServiceProvider"
import { absWebServiceProvider, ENDPOINT, TEndpoint } from "../absWebServiceProvider"
import { TOptions } from "../../types/TOptions"
import { RESPONSE } from "../../lib/Const"
import { SqlQueryHelper } from "../../lib/SqlQueryHelper"
import { HttpResponse } from "../../server/HttpResponse"
import { Cache } from "../../server/Cache"
import { TJson } from "../../types/TJson"
import { JsonHelper } from "../../lib/JsonHelper"
import { StringHelper } from "../../lib/StringHelper"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { Sandbox } from "../../server/Sandbox"
import { DataTable } from "../../types/DataTable"
import { TContext } from "../../@types/TContext"
import { TUrl } from "../../TUrl"


//
export type TConfigSourceWebServiceOptions = {
    type: WEBSERVICE
    content: CONTENT
}
    & TContentConfig
    & TConfigWebServiceOptions

export type TConfigSourceWebService = {
    provider: DATA_PROVIDER.WEBSERVICE
    host: TUrl
    options: TConfigSourceWebServiceOptions
}


//
export class WebServiceData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.WEBSERVICE
    Params: TConfigSourceWebService | undefined
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
    Init(source: string, sourceParams: TConfigSource): void {
        this.SourceName = source
        this.Params = _.merge(this.Params, sourceParams)
        //
        const { content, type: webservice } = this.Params.options

        if (content === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Content type is not defined`)

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
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

        const { schema, entity } = schemaRequest

        this.SetContentHandler(entity)

        const endpointRead = this.Connection.Endpoints.get(ENDPOINT.COLLECTION_READ)

        if (!endpointRead || !typia.validateEquals<TEndpoint>(endpointRead))
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest),
            {
                $request: {
                    "data-path": endpointRead.DataPath
                }
            }
        )

        const requestReadUrl = PlaceHolder.EvaluateJsCode(
            StringHelper.Url(
                entity,
                endpointRead.Url
            ),
            new Sandbox($context)
        )

        if (!requestReadUrl)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read(requestReadUrl)
        )

        const options: TOptions = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(this.EscapeEntity(entity))
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const data = await this.File.get(entity)!.Get(sqlQuery, $context)

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

    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)

        const endpointCreate = this.Connection.Endpoints.get(ENDPOINT.ITEM_CREATE)

        if (!endpointCreate || !typia.validateEquals<TEndpoint>(endpointCreate))
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest),
            {
                $request: {
                    "data-path": endpointCreate.DataPath
                }
            }
        )

        const options: TOptions = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const requestUrl = PlaceHolder.EvaluateJsCode(
            StringHelper.Url(
                entity,
                endpointCreate.Url
            ),
            new Sandbox($context)
        )

        if (!requestUrl)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        await Promise.all(options.Data.Rows.map((data: TJson) => this.Connection!.Create(
            requestUrl,
            JsonHelper.Stringify(data)
        )))

        // clean cache
        Cache.Remove(schemaRequest)
        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (!this.Connection)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

        const { entity } = schemaRequest

        this.SetContentHandler(entity)

        const endpointRead = this.Connection.Endpoints.get(ENDPOINT.COLLECTION_READ)

        if (!endpointRead || !typia.validateEquals<TEndpoint>(endpointRead))
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest),
            {
                $request: {
                    "data-path": endpointRead.DataPath
                }
            }
        )

        const options: TOptions = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const requestReadUrl = PlaceHolder.EvaluateJsCode(
            StringHelper.Url(
                entity,
                endpointRead.Url
            ),
            new Sandbox($context)
        )

        if (!requestReadUrl)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read(requestReadUrl)
        )

        const endpointUpdate = this.Connection.Endpoints.get(ENDPOINT.ITEM_UPDATE)

        if (!endpointUpdate || !typia.validateEquals<TEndpoint>(endpointUpdate))
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)


        const sqlQueryHelper = new SqlQueryHelper()
            .Select(this.GetIdName(endpointUpdate))
            .From(this.EscapeEntity(entity))
            .Where(options.Filter)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const keysCollection = await this.File.get(entity)!.Get(sqlQuery, $context)

        await Promise.all(keysCollection.Rows.map((row: TJson) => {
            const data = Array.isArray(options.Data?.Rows)
                ? options.Data.Rows.at(0)
                : options.Data?.Rows

            const requestUrl = PlaceHolder.EvaluateJsCode(
                StringHelper.Url(
                    entity,
                    endpointUpdate.Url
                ),
                new Sandbox(
                    _.merge(
                        $context,
                        {
                            $item: row
                        }
                    )
                )
            )

            if (!requestUrl)
                throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

            return this.Connection!.Update(
                requestUrl,
                JsonHelper.Stringify(data)
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

        const endpointRead = this.Connection.Endpoints.get(ENDPOINT.COLLECTION_READ)

        if (!endpointRead || !typia.validateEquals<TEndpoint>(endpointRead))
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest),
            {
                $request: {
                    "data-path": endpointRead.DataPath
                }
            }
        )

        const options: TOptions = this.Options.Parse(schemaRequest, $context)        

        const requestReadUrl = PlaceHolder.EvaluateJsCode(
            StringHelper.Url(
                entity,
                endpointRead.Url
            ),
            new Sandbox($context)
        )

        if (!requestReadUrl)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)

        this.File.get(entity)!.InitContent(
            entity,
            await this.Connection.Read(requestReadUrl)
        )

        const endpointDelete = this.Connection.Endpoints.get(ENDPOINT.ITEM_DELETE)

        if (!endpointDelete || !typia.validateEquals<TEndpoint>(endpointDelete))
            throw new HttpErrorInternalServerError(`${this.SourceName}: Invalid endpoint in WebService provider`)


        const sqlQueryHelper = new SqlQueryHelper()
            .Select(this.GetIdName(endpointDelete))
            .From(this.EscapeEntity(entity))
            .Where(options.Filter)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const keysCollection = await this.File.get(entity)!.Get(sqlQuery, $context)

        await Promise.all(keysCollection.Rows.map((row: TJson) => {
            const requestUrl = PlaceHolder.EvaluateJsCode(
                StringHelper.Url(
                    entity,
                    endpointDelete.Url
                ),
                new Sandbox(
                    _.merge(
                        $context,
                        {
                            $item: row
                        }
                    )
                )
            )

            if (!requestUrl)
                return Promise.resolve()

            return this.Connection!.Delete(requestUrl)
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

    // eslint-disable-next-line class-methods-use-this
    GetIdName(endpoint: TEndpoint): string {
        if (!endpoint?.Keys)
            return "*"

        const id: string[] = endpoint.Keys
            .filter(v => v.startsWith('$item'))
            .map(v => v.replace('$item.', ''))

        return (id && id.length > 0)
            ? id.at(0)!
            : "*"
    }
}    