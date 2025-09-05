//
//
//
import _ from "lodash"
import { Readable } from "stream"
// Lazy-loaded soap module
//
import { absWebServiceProvider } from "../base/absWebServiceProvider"
import {  ENDPOINT, HEADER } from "../@consts"
import { JsonUtils } from '../../../utils/JsonUtils'
import { TWebServiceDataOptions, TConfigSourceWebService } from "../../source/providers/WebServiceData"
import { Logger } from "../../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorSwitch } from "../../errors/HttpErrors"
import { TContext } from "../../sandbox/types/TContext"
import { Sandbox } from "../../sandbox/Sandbox"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { CONTENT } from "../../content/@consts"
import { TJson } from "../../../types/TJson"
import { Validator } from "../../../utils/Validator"


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

        if (Validator.TEndpoint(endpoint)) {
            const { Data } = this.Endpoints.get(ENDPOINT.SESSION)!
            if (Validator.TUserCredentials(Data)) {
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
            const [header] = Object.keys(HEADER[this.ConfigSourceOptions!.content])
            const [value] = Object.values(HEADER[this.ConfigSourceOptions!.content])

            if (typeof header == 'string' && typeof value == 'string')
                this.Client.addHttpHeader(header, value)

        } catch (error: any) {
            const _message = error.errors?.at(1).message ?? error.errors?.at(0).message ?? error.message
            Logger.Error(`SoapWebService.Init: ${_message}`)
        }
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Logger.Debug(`${Logger.Out} SoapWebService connected`)
    }

    // eslint-disable-next-line class-methods-use-this
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

            // eslint-disable-next-line no-param-reassign
            $context = _.merge(
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

        } catch (error: any) {
            throw HttpErrorSwitch(error.status, error.message)
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