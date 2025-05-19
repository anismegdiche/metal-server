//
//
//
//
//
import _ from "lodash"
import { Readable } from "stream"
import { createClientAsync, Client, IOptions } from "soap"
import typia from "typia"
//
import { absWebServiceProvider, ENDPOINT, HEADER, TEndpoint } from "../absWebServiceProvider"
import { JsonHelper } from '../../lib/JsonHelper'
import { TWebServiceDataOptions, TConfigSourceWebService } from "../data/WebServiceData"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorSwitch } from "../../server/HttpErrors"
import { TContext } from "../../types/TContext"
import { Sandbox } from "../../server/Sandbox"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { TUserCredentials } from "../absAuthProvider"
import { CONTENT } from "../ContentProvider"
import { TJson } from "../../types/TJson"


//
export class SoapWebService extends absWebServiceProvider {

    DEFAULT: Partial<TWebServiceDataOptions> = {
        content: CONTENT.XML
    }

    ConfigSource?: TConfigSourceWebService
    ConfigSourceOptions?: TWebServiceDataOptions
    Client?: Client

    Headers: Record<string, string>[] = []

    // SOAP
    SoapNamespace: {
        Prefix: string
        Uri: string
    } = {
            Prefix: 'web',
            Uri: 'http://example.com/soap/namespace'
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

        let soapOptions: IOptions = {}

        if (typia.equals<TEndpoint>(endpoint)) {
            const { Data } = this.Endpoints.get(ENDPOINT.SESSION)!
            if (typia.is<TUserCredentials>(Data)) {
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
            this.Client = await createClientAsync(this.ConfigSource!.host, soapOptions)

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

            return Readable.from(JsonHelper.Stringify(wsResp.at(1)))

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