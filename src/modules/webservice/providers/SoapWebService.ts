//
//
//
import { merge } from 'lodash-es'
import { Readable } from "node:stream"
// Lazy-loaded soap module
//
import type { TJson } from "../../../types/TJson"
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { User } from '../../auth/User'
import { CONTENT } from "../../content/@consts"
import { HttpErrorInternalServerError, HttpErrorSwitch, NormalizeError } from "../../errors/HttpErrors"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import type { TConfigSourceWebService, TWebServiceDataOptions } from "../../source/providers/WebServiceData"
import { ENDPOINT, HEADER } from "../@consts"
import { absWebServiceProvider } from "../base/absWebServiceProvider"


//
export class SoapWebService extends absWebServiceProvider {

    DEFAULT: Partial<TWebServiceDataOptions> = {
        content: CONTENT.XML
    }

    ConfigSource?: TConfigSourceWebService
    ConfigSourceOptions?: TWebServiceDataOptions
    Client?: import('soap').Client

    Headers: Record<string, string>[] = []

    // SOAP
    SoapNamespace: {
        Prefix: string
        Uri: string
    } = {
            Prefix: 'web',
            Uri: 'http://example.com/soap/namespace'
        }

    private static _soapModule: typeof import('soap');
    private static async _loadSoapModule(): Promise<typeof import('soap')> {
        if (!this._soapModule) {
            this._soapModule = await import('soap');
        }
        return this._soapModule;
    }

    constructor() {
        super()
    }

    SetConfig(configSource: TConfigSourceWebService): void {
        super.SetConfig(configSource)
    }

    @Logger.LogFunction()
    async Init(): Promise<void> {

        const endpoint = this.Endpoints.get(ENDPOINT.SESSION)

        let soapOptions: import('soap').IOptions = {}

        if (this.IsEndpoint(endpoint)) {
            const { Data } = this.Endpoints.get(ENDPOINT.SESSION)!
            if (User.IsUserCredentials(Data)) {
                const { username, password } = Data
                const auth = Buffer.from(`${username}:${password}`).toString('base64')
                soapOptions = {
                    wsdl_headers: {
                        Authorization: `Basic ${auth}`
                    }
                }
            }
        }

        try {
            const soap = await SoapWebService._loadSoapModule();
            this.Client = await soap.createClientAsync(this.ConfigSource!.host, soapOptions)

            if (!this.Client)
                throw new HttpErrorInternalServerError(`SoapWebService.Init: Failed to create client`)

            // set content type
            const [header] = Object.keys(HEADER[this.ConfigSourceOptions!.content]!)
            const [value] = Object.values(HEADER[this.ConfigSourceOptions!.content]!)

            if (typeof header == 'string' && typeof value == 'string')
                this.Client.addHttpHeader(header, value)

        } catch (err: unknown) {
            const _err = NormalizeError(err)
            const _message = _err.errors.at(1).message ?? _err.errors.at(0).message ?? _err.message
            Logger.Error(`SoapWebService.Init: ${_message}`)
        }
    }


    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Logger.Debug(`${Logger.Out} SoapWebService connected`)
    }


    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.Out} SoapWebService disconnected`)
    }

    async RequestClient(endpointType: ENDPOINT, data?: TJson, $context?: Partial<TContext>): Promise<Readable> {

        if (!this.Client)
            throw new HttpErrorInternalServerError(`SOAP:${endpointType}: Client is not initialized`)

        if (!this.Endpoints.has(endpointType))
            throw new HttpErrorInternalServerError(`${endpointType}: undefined endpoint for ${endpointType}`)

        try {
            const { Method, Data, SessionHeaders, DataPath } = this.Endpoints.get(endpointType)!

            const $__method = PlaceHolder.EvaluateJsCode<string>(Method, new Sandbox($context))
            const $__data = PlaceHolder.EvaluateJsCode<TJson>(Data ?? data, new Sandbox($context)) ?? {}
            const $__dataPath = PlaceHolder.EvaluateJsCode<string>(DataPath, new Sandbox($context))

            Logger.Debug(`${Logger.In} ${endpointType}: ${this.ConfigSource!.host}, ${$__method}`)

            const wsResp = await this.Client[`${$__method}Async`]($__data)

            if (!wsResp)
                throw new HttpErrorInternalServerError(`${endpointType}: ${wsResp?.statusText}`)


            $context = merge(
                $context,
                <Partial<TContext>>{
                    $request: {
                        "data-path": $__dataPath
                    },
                    $response: {
                        url: this.ConfigSource!.host,
                        host: this.ConfigSource!.host,
                        body: wsResp.at(1)
                    }
                }
            )

            // set session headers after request
            const $__sessionHeaders = PlaceHolder.EvaluateJsCode<TJson<string>>(SessionHeaders, new Sandbox($context))
            if ($__sessionHeaders) {
                for (const [_headerName, _headerValue] of Object.entries($__sessionHeaders)) {
                    this.Client.addHttpHeader(_headerName, _headerValue)
                }
            }

            return Readable.from(JsonUtils.Stringify(wsResp.at(1)))

        } catch (err: unknown) {
            const _err = NormalizeError(err)   
            throw HttpErrorSwitch(_err.status, _err.message)
        }
    }

    @Logger.LogFunction()
    async Read($context: Partial<TContext>): Promise<Readable> {
        return this.RequestClient(ENDPOINT.COLLECTION_READ, undefined, $context)
    }

    @Logger.LogFunction()
    async Create(data: TJson, $context: Partial<TContext>): Promise<Readable> {
        return this.RequestClient(ENDPOINT.ITEM_CREATE, data, $context)
    }

    @Logger.LogFunction()
    async Update(data: TJson, $context: Partial<TContext>): Promise<Readable> {
        return this.RequestClient(ENDPOINT.ITEM_UPDATE, data, $context)
    }

    @Logger.LogFunction()
    async Delete($context: Partial<TContext>): Promise<Readable> {
        return this.RequestClient(ENDPOINT.ITEM_DELETE, undefined, $context)
    }
}