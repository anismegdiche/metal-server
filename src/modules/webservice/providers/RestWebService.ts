//
//
//
import axios, { type AxiosInstance, type AxiosResponse } from "axios"
import { merge } from 'lodash-es'
import { Readable } from "node:stream"
//
import type { TJson } from "../../../types/TJson"
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { StringUtils } from "../../../utils/StringUtils"
import { CONTENT } from "../../content/@consts"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import { HttpErrorInternalServerError, HttpErrorSwitch, NormalizeError } from "../../errors/HttpErrors"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import type { U__source_webservice, U__source_webservice_options } from "../../source/providers/WebServiceData"
import { ENDPOINT, HEADER } from "../@consts"
import { absWebServiceProvider } from '../base/absWebServiceProvider'

//
export class RestWebService extends absWebServiceProvider {

    DEFAULT: Partial<U__source_webservice_options> = {
        content: CONTENT.JSON
    }

    ConfigSource?: U__source_webservice
    ConfigSourceOptions?: U__source_webservice_options
    Client?: AxiosInstance

    Headers: Record<string, string>[] = []

    constructor() {
        super()
    }

    SetConfig(configSource: U__source_webservice): void {
        super.SetConfig(configSource)
    }

    @Logger.LogFunction()
    async Init(): Promise<void> {

        this.Client = axios.create()

        this.Client.defaults.baseURL = this.ConfigSource!.host

        // set content type
        const [header] = Object.keys(HEADER[this.ConfigSourceOptions!.content]!)
        const [value] = Object.values(HEADER[this.ConfigSourceOptions!.content]!)

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


            $context = merge(
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

        } catch (err: unknown) {
            const _err = NormalizeError(err)
            throw HttpErrorSwitch(
                _err.status || HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
                JsonUtils.Stringify(
                    _err.response.data.message ||
                    _err.response.data ||
                    _err.errors ||
                    _err.message ||
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
