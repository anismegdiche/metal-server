//
//
//
import _ from "lodash"
import { Readable } from "stream"
import axios, { AxiosResponse, AxiosInstance } from "axios"
//
import { absWebServiceProvider } from '../base/absWebServiceProvider'
import { TConfigSourceWebService, TWebServiceDataOptions } from "../../source/providers/WebServiceData"
import { Logger } from "../../../utils/Logger"
import { StringUtils } from "../../../utils/StringUtils"
import { HttpErrorInternalServerError, HttpErrorSwitch } from "../../errors/HttpErrors"
import { JsonUtils } from '../../../utils/JsonUtils'
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import { TContext } from "../../sandbox/types/TContext"
import { TJson } from "../../../types/TJson"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import { HEADER, ENDPOINT } from "../@consts"
import { CONTENT } from "../../content/@consts"


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

            const $__method = PlaceHolder.EvaluateJsCode<string>(Method, new Sandbox($context))
            const $__url = PlaceHolder.EvaluateJsCode<string>(Url, new Sandbox($context))
            const $__data = PlaceHolder.EvaluateJsCode<TJson>(Data, new Sandbox($context))
            const $__dataPath = PlaceHolder.EvaluateJsCode<string>(DataPath, new Sandbox($context))

            Logger.Debug(`${Logger.In} ${endpointType}: ${StringUtils.Url(this.ConfigSource!.host, Url)}`)

            const wsResp: AxiosResponse = await this.Client({
                method: ($__method ?? Method).toLowerCase(),
                url: $__url,
                data: JsonUtils.Stringify($__data ?? data)
            })

            if (!httpStatusSuccess.includes(wsResp.status))
                throw HttpErrorSwitch(wsResp.status, `${endpointType}: ${wsResp.statusText}`)

             
            $context = _.merge(
                $context,
                {
                    $request: {
                        "data-path": $__dataPath
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
                const $__sessionHeaders = PlaceHolder.EvaluateJsCode(SessionHeaders, new Sandbox($context)) as Exclude<TJson<string>, undefined>
                for (const [_headerName, _headerValue] of Object.entries($__sessionHeaders)) {
                    this.Client.defaults.headers.common[_headerName] = _headerValue
                }
            }

            return Readable.from(JsonUtils.Stringify(wsResp.data))

        } catch (error: any) {
            throw HttpErrorSwitch(
                error.status || HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, 
                JsonUtils.Stringify(
                    error.response.data.message || 
                    error.response.data || 
                    error.errors || 
                    error.message || 
                    "Unknown error"
                )
            )
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (this.Endpoints.has(ENDPOINT.SESSION))
            await this.RequestClient(ENDPOINT.SESSION, [200])
    }

     
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

    @Logger.LogFunction()
    async ListEntities($context: Partial<TContext>): Promise<Readable> {
        return this.RequestClient(ENDPOINT.COLLECTION_LIST, [200], undefined, $context)
    }
}
