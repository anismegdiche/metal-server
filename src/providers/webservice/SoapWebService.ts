//
//
//
//
//
import { Readable } from "stream"
import { createClientAsync, Client }  from "soap"
//
import { absWebServiceProvider, HEADER, TUrlMethod } from "../absWebServiceProvider"
import { TConfigSourceWebServiceOptions, TConfigSourceWebService } from "../data/WebServiceData"
import { Logger } from "../../utils/Logger"
import { StringHelper } from "../../lib/StringHelper"
import { HttpErrorInternalServerError } from "../../server/HttpErrors"
import { JsonHelper } from '../../lib/JsonHelper'
import { TJson } from "../../types/TJson"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { Sandbox } from "../../server/Sandbox"

export const enum ENDPOINT {
    COLLECTION_READ = "collection:read",
    ITEM_CREATE = "item:create",
    ITEM_READ = "item:read",
    ITEM_UPDATE = "item:update",
    ITEM_DELETE = "item:delete"
}

export type TConfigSourceWebServiceSoap = {
    endpoints: {
        login?: {
            url?: TUrlMethod
            data?: TJson<string>
            headers?: TJson<string>
        }
        collection?: {
            read: TJson
        },
        item?: {
            create?: TJson
            read?: TJson
            update?: TJson
            delete?: TJson
        }
    }
}

export class SoapWebService extends absWebServiceProvider {

    DEFAULT: Partial<TConfigSourceWebServiceSoap> = {
        endpoints: {}
    }

    ConfigSource?: TConfigSourceWebService
    ConfigSourceOptions?: TConfigSourceWebServiceOptions
    Client: Client | undefined

    Headers: Record<string, string>[] = []

    constructor() {
        super()
    }

    SetConfig(configSource: TConfigSourceWebService): void {
        super.SetConfig(configSource)

        if (this.ConfigSourceOptions?.endpoints === undefined || this.ConfigSource?.host === undefined)
            throw new HttpErrorInternalServerError('SoapWebService: No urls defined in config')

        //TODO to simplify
        if (typeof this.ConfigSourceOptions.endpoints.collection == "object")
            Object.entries(this.ConfigSourceOptions.endpoints.collection).forEach(([op, opConfig]) => {
                const [endpointMethod] = Object.keys(opConfig)
                const [endpointUrl] = Object.values(opConfig)
                this.Endpoints.set(
                    `collection:${op}`,
                    {
                        Method: endpointMethod,
                        Url: endpointUrl,
                        Keys: PlaceHolder.GetVarName(endpointUrl)
                    })
            })

        //TODO to simplify
        if (typeof this.ConfigSourceOptions.endpoints.item == "object")
            Object.entries(this.ConfigSourceOptions.endpoints.item).forEach(([op, opConfig]) => {
                const [endpointMethod] = Object.keys(opConfig)
                const [endpointUrl] = Object.values(opConfig)
                this.Endpoints.set(
                    `item:${op}`,
                    {
                        Method: endpointMethod,
                        Url: endpointUrl,
                        Keys: PlaceHolder.GetVarName(endpointUrl)
                    })
            })
    }

    @Logger.LogFunction()
    async Init(): Promise<void> {
        if (!this.ConfigSourceOptions?.content)
            return

        this.Client = await createClientAsync(this.ConfigSource!.host)

        if (!this.Client)
            throw new HttpErrorInternalServerError(`SoapWebService.Init: Failed to create client`)

        // set content type
        const [header] = Object.keys(HEADER[this.ConfigSourceOptions.content])
        const [value] = Object.values(HEADER[this.ConfigSourceOptions.content])

        if (typeof header == 'string' && typeof value == 'string')
            this.Client.addHttpHeader(header, value)
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (typeof this.ConfigSourceOptions?.endpoints.login !== 'object' || !this.Client)
            return

        const { url, data, headers } = this.ConfigSourceOptions.endpoints.login

        if (!url || !data)
            return

        const [endpointMethod = "POST"] = Object.keys(url)
        const [endpointUrl = "/"] = Object.values(url)

        Logger.Debug(`${Logger.In} SoapWebService.Connect: ${StringHelper.Url(this.ConfigSource!.host, JsonHelper.Stringify(url))}`)
        const wsLogin = await this.Client[endpointMethod.toLowerCase()](endpointUrl, data)

        if (!wsLogin)
            throw new HttpErrorInternalServerError(`SoapWebService.Connect: Failed to connect`)

        if (!headers)
            return

        for (const [headerName, headerValue] of Object.entries(headers)) {
            const __headerNewValue = PlaceHolder.EvaluateJsCode(
                headerValue,
                new Sandbox({
                    $response: {
                        url: endpointUrl,
                        body: wsLogin
                    }
                }))
            this.Client.addHttpHeader(headerName, __headerNewValue)
        }
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.Out} SoapWebService disconnected`)
    }

    @Logger.LogFunction()
    async Create(endpoint: string, data: string): Promise<Readable> {

        if (!this.Endpoints.has(ENDPOINT.ITEM_CREATE) || !this.Client)
            throw new HttpErrorInternalServerError(`SoapWebService.Create: undefined endpoint for ${ENDPOINT.ITEM_CREATE}`)

        try {
            const { Method } = this.Endpoints.get(ENDPOINT.ITEM_CREATE)!

            Logger.Debug(`${Logger.In} SoapWebService.Create: ${StringHelper.Url(this.ConfigSource!.host, endpoint)}`)
            const wsResp = await this.Client[Method.toLowerCase()](endpoint, data)

            if (!wsResp)
                throw new HttpErrorInternalServerError(`SoapWebService.Create: Failed to create item`)

            return Readable.from(JsonHelper.Stringify(wsResp))
        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    @Logger.LogFunction()
    async Read(endpoint: string): Promise<Readable> {

        if (!this.Endpoints.has(ENDPOINT.COLLECTION_READ) || !this.Client)
            throw new HttpErrorInternalServerError(`SoapWebService.Read: undefined endpoint for ${ENDPOINT.COLLECTION_READ}`)

        try {
            const { Method } = this.Endpoints.get(ENDPOINT.COLLECTION_READ)!
            const params = {}

            Logger.Debug(`${Logger.In} SoapWebService.Read: ${StringHelper.Url(this.ConfigSource!.host, endpoint)}`)
            const wsResp = await this.Client[`${Method}Async`](params)

            if (!wsResp)
                throw new HttpErrorInternalServerError(`SoapWebService.Read: Failed to read collection`)

            return Readable.from(JsonHelper.Stringify(wsResp))

        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    @Logger.LogFunction()
    async Update(endpoint: string, body: string): Promise<Readable> {

        if (!this.Endpoints.has(ENDPOINT.ITEM_UPDATE) || !this.Client)
            throw new HttpErrorInternalServerError(`SoapWebService.Update: undefined endpoint for ${ENDPOINT.ITEM_UPDATE}`)

        try {
            const { Method } = this.Endpoints.get(ENDPOINT.ITEM_UPDATE)!

            Logger.Debug(`${Logger.In} SoapWebService.Update: ${StringHelper.Url(this.ConfigSource!.host, endpoint)}`)
            const wsResp = await this.Client[Method.toLowerCase()](endpoint, body)

            if (!wsResp)
                throw new HttpErrorInternalServerError(`SoapWebService.Update: Failed to update item`)

            return Readable.from(JsonHelper.Stringify(wsResp))

        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    @Logger.LogFunction()
    async Delete(endpoint: string): Promise<Readable> {

        if (!this.Endpoints.has(ENDPOINT.ITEM_DELETE) || !this.Client)
            throw new HttpErrorInternalServerError(`SoapWebService.Delete: undefined endpoint for ${ENDPOINT.ITEM_DELETE}`)

        try {
            const { Method } = this.Endpoints.get(ENDPOINT.ITEM_DELETE)!

            Logger.Debug(`${Logger.In} SoapWebService.Delete: ${StringHelper.Url(this.ConfigSource!.host, endpoint)}`)
            const wsResp = await this.Client[Method.toLowerCase()](endpoint)

            if (!wsResp)
                throw new HttpErrorInternalServerError(`SoapWebService.Delete: Failed to delete item`)

            return Readable.from(JsonHelper.Stringify(wsResp))

        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    GetKeyName(endpoint: string): string[] | undefined {
        return this.Endpoints.get(endpoint)?.Keys
    }
}