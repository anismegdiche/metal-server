//
//
//
//
//
import { Readable } from "stream"
import { createClientAsync, Client } from "soap"
//
import { absWebServiceProvider, ENDPOINT, HEADER } from "../absWebServiceProvider"
import { JsonHelper } from '../../lib/JsonHelper'
import { TWebServiceDataOptions, TConfigSourceWebService } from "../data/WebServiceData"
import { Logger } from "../../utils/Logger"
import { StringHelper } from "../../lib/StringHelper"
import { HttpErrorInternalServerError } from "../../server/HttpErrors"


//
export class SoapWebService extends absWebServiceProvider {

    DEFAULT: Partial<TWebServiceDataOptions> = {
        endpoints: {}
    }

    ConfigSource?: TConfigSourceWebService
    ConfigSourceOptions?: TWebServiceDataOptions
    Client?: Client 

    Headers: Record<string, string>[] = []

    constructor() {
        super()
    }

    SetConfig(configSource: TConfigSourceWebService): void {
        super.SetConfig(configSource)

        if (this.ConfigSourceOptions?.endpoints === undefined || this.ConfigSource?.host === undefined)
            throw new HttpErrorInternalServerError('SoapWebService: No urls defined in config')

        this.ProcessEndpoints('collection', this.ConfigSourceOptions.endpoints.collection)
        this.ProcessEndpoints('item', this.ConfigSourceOptions.endpoints.item)
    }

    @Logger.LogFunction()
    async Init(): Promise<void> {
        if (!this.ConfigSourceOptions?.content)
            return
        
        try {
            this.Client = await createClientAsync(this.ConfigSource!.host)

            if (!this.Client)
                throw new HttpErrorInternalServerError(`SoapWebService.Init: Failed to create client`)

            // set content type
            const [header] = Object.keys(HEADER[this.ConfigSourceOptions.content])
            const [value] = Object.values(HEADER[this.ConfigSourceOptions.content])

            if (typeof header == 'string' && typeof value == 'string')
                this.Client.addHttpHeader(header, value)
        } catch (error: any) {
            const _message = error.errors?.at(1).message ?? error.errors?.at(0).message ?? error.message
            Logger.Error(`SoapWebService.Init: ${_message}`)
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (typeof this.ConfigSourceOptions?.endpoints.session !== 'object' || !this.Client)
            return

        const { url, data, headers } = this.ConfigSourceOptions.endpoints.session

        if (!url || !data)
            return

        const [endpointMethod = "POST"] = Object.keys(url)
        const [endpointUrl = "/"] = Object.values(url)

        Logger.Debug(`${Logger.In} SoapWebService.Connect: ${StringHelper.Url(this.ConfigSource!.host, JsonHelper.Stringify(url))}`)
        // const wsLogin = await this.Client[endpointMethod.toLowerCase()](endpointUrl, data)

        // if (!wsLogin)
        //     throw new HttpErrorInternalServerError(`SoapWebService.Connect: Failed to connect`)

        // if (!headers)
        //     return

        // for (const [headerName, headerValue] of Object.entries(headers)) {
        //     const __headerNewValue = PlaceHolder.EvaluateJsCode(
        //         headerValue,
        //         new Sandbox({
        //             $response: {
        //                 url: endpointUrl,
        //                 body: wsLogin
        //             }
        //         }))
        //     this.Client.addHttpHeader(headerName, __headerNewValue)
        // }
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

            return Readable.from(wsResp.at(1))

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
}