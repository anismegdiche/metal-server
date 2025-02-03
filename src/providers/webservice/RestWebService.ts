//
//
//
//
//
import _ from "lodash"
import { Readable } from "stream"
import axios, { AxiosResponse, AxiosInstance } from "axios"
//
import { absWebServiceProvider, ENDPOINT, HEADER } from '../absWebServiceProvider'
import { TConfigSourceWebService, TWebServiceDataOptions } from "../data/WebServiceData"
import { Logger } from "../../utils/Logger"
import { StringHelper } from "../../lib/StringHelper"
import { HttpErrorInternalServerError, HttpErrorSwitch } from "../../server/HttpErrors"
import { JsonHelper } from '../../lib/JsonHelper'
import { PlaceHolder } from "../../utils/PlaceHolder"
import { Sandbox } from "../../server/Sandbox"
import { TContext } from "../../@types/TContext"
import { CONTENT } from "../ContentProvider"
import { TJson } from "../../types/TJson"


//
export class RestWebService extends absWebServiceProvider {

    DEFAULT: Partial<TWebServiceDataOptions> = {
        content: CONTENT.JSON
    }

    ConfigSource?: TConfigSourceWebService
    ConfigSourceOptions?: TWebServiceDataOptions
    Client?: AxiosInstance

    Headers: Record<string, string>[] = []

    constructor() {
        super()
    }

    SetConfig(configSource: TConfigSourceWebService): void {
        super.SetConfig(configSource)
    }

    @Logger.LogFunction()
    async Init(): Promise<void> {

        this.Client = axios.create()

        this.Client.defaults.baseURL = this.ConfigSource!.host

        // set content type
        const [header] = Object.keys(HEADER[this.ConfigSourceOptions!.content])
        const [value] = Object.values(HEADER[this.ConfigSourceOptions!.content])

        if (typeof header == 'string' && typeof value == 'string')
            this.Client.defaults.headers.common[header] = value
    }

    async RequestClient(endpointType: ENDPOINT, httpStatusSuccess: number[], data?: TJson, $context?: Partial<TContext>): Promise<Readable> {

        if (!this.Endpoints.has(endpointType) || !this.Client)
            throw new HttpErrorInternalServerError(`${endpointType}: undefined endpoint for ${endpointType}`)

        try {
            const { Method, Url, Data, SessionHeaders, DataPath } = this.Endpoints.get(endpointType)!

            const _Method = PlaceHolder.EvaluateJsCode<string>(Method, new Sandbox($context))
            const _Url = PlaceHolder.EvaluateJsCode<string>(
                StringHelper.Url(
                    $context?.$entity,
                    Url
                ),
                new Sandbox($context)
            )
            const _Data = PlaceHolder.EvaluateJsCode(Data, new Sandbox($context))
            const _DataPath = PlaceHolder.EvaluateJsCode(DataPath, new Sandbox($context))

            Logger.Debug(`${Logger.In} ${endpointType}: ${StringHelper.Url(this.ConfigSource!.host, Url)}`)

            const wsResp: AxiosResponse = await this.Client({
                method: (_Method ?? Method).toLowerCase(),
                url: _Url,
                data: _Data ?? JsonHelper.Stringify(data)
            })

            if (!httpStatusSuccess.includes(wsResp.status))
                throw HttpErrorSwitch(wsResp.status, `${endpointType}: ${wsResp.statusText}`)

            // eslint-disable-next-line no-param-reassign
            $context = _.merge(
                $context,
                {
                    $request: {
                        "data-path": _DataPath
                    },
                    $response: {
                        url: wsResp.config.url,
                        host: wsResp.request.host,
                        body: wsResp.data
                    }
                }
            )

            // set session headers after request
            if (SessionHeaders) {
                const _SessionHeaders = PlaceHolder.EvaluateJsCode(SessionHeaders, new Sandbox($context)) as Exclude<TJson<string>, undefined>
                for (const [_headerName, _headerValue] of Object.entries(_SessionHeaders)) {
                    this.Client.defaults.headers.common[_headerName] = _headerValue
                }
            }

            return Readable.from(JsonHelper.Stringify(wsResp.data))

        } catch (error: any) {
            throw HttpErrorSwitch(error.status, error.message)
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (this.Endpoints.has(ENDPOINT.SESSION))
            this.RequestClient(ENDPOINT.SESSION, [200])
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.Out} RestWebService disconnected`)
    }

    @Logger.LogFunction()
    async Create(data: TJson, $context: Partial<TContext>): Promise<Readable> {
        return this.RequestClient(ENDPOINT.ITEM_CREATE, [200, 201], data, $context)
    }

    @Logger.LogFunction()
    async Read($context: Partial<TContext>): Promise<Readable> {
        return this.RequestClient(ENDPOINT.COLLECTION_READ, [200], undefined, $context)
    }

    @Logger.LogFunction()
    async Update(data: TJson, $context: Partial<TContext>): Promise<Readable> {
        return this.RequestClient(ENDPOINT.ITEM_UPDATE, [200, 204], data, $context)
    }

    @Logger.LogFunction()
    async Delete($context: Partial<TContext>): Promise<Readable> {
        return this.RequestClient(ENDPOINT.ITEM_DELETE, [200, 204], undefined, $context)
    }
}
