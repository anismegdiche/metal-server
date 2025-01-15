//
//
//
//
//
import { Readable } from "stream"
import axios, { AxiosResponse, AxiosInstance } from "axios"
//
import { absWebServiceProvider, ENDPOINT, HEADER, TWebServiceEndpointMethodConfig } from '../absWebServiceProvider'
import { TConfigSourceWebServiceOptions, TConfigSourceWebService } from "../data/WebServiceData"
import { Logger } from "../../utils/Logger"
import { StringHelper } from "../../lib/StringHelper"
import { HttpErrorInternalServerError, HttpErrorSwitch } from "../../server/HttpErrors"
import { JsonHelper } from '../../lib/JsonHelper'
import { PlaceHolder } from "../../utils/PlaceHolder"
import { Sandbox } from "../../server/Sandbox"
import { TConfigWebServiceOptions } from "../WebServiceProvider"


//
export class RestWebService extends absWebServiceProvider {

    DEFAULT: Partial<TConfigWebServiceOptions> = {
        endpoints: {}
    }

    ConfigSource?: TConfigSourceWebService
    ConfigSourceOptions?: TConfigSourceWebServiceOptions
    Client: AxiosInstance | undefined

    Headers: Record<string, string>[] = []

    constructor() {
        super()
    }

    SetConfig(configSource: TConfigSourceWebService): void {
        super.SetConfig(configSource)

        if (this.ConfigSourceOptions?.endpoints === undefined || this.ConfigSource?.host === undefined)
            throw new HttpErrorInternalServerError('RestWebService: No urls defined in config')

        this.ProcessEndpoints('collection', this.ConfigSourceOptions.endpoints.collection)
        this.ProcessEndpoints('item', this.ConfigSourceOptions.endpoints.item)
    }

    @Logger.LogFunction()
    Init(): void {
        if (!this.ConfigSourceOptions?.content)
            return

        this.Client = axios.create()

        this.Client.defaults.baseURL = this.ConfigSource!.host

        // set content type
        const [header] = Object.keys(HEADER[this.ConfigSourceOptions.content])
        const [value] = Object.values(HEADER[this.ConfigSourceOptions.content])

        if (typeof header == 'string' && typeof value == 'string')
            this.Client.defaults.headers.common[header] = value
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (typeof this.ConfigSourceOptions?.endpoints.session !== 'object' || !this.Client)
            return

        const [loginEndpointMethod] = Object.keys(this.ConfigSourceOptions.endpoints.session)
        if (!loginEndpointMethod)
            return

        const loginEndpointConfig: TWebServiceEndpointMethodConfig = this.ConfigSourceOptions.endpoints.session[loginEndpointMethod]

        if (!loginEndpointConfig)
            return

        Logger.Debug(`${Logger.In} RestWebService.Connect: ${StringHelper.Url(this.ConfigSource!.host, JsonHelper.Stringify(loginEndpointConfig))}`)
        const wsLogin = await this.Client({
            method: loginEndpointMethod.toLowerCase(),
            url: StringHelper.Url(
                this.ConfigSource!.host,
                loginEndpointConfig.request
            ),
            data: loginEndpointConfig.data
        })

        if (wsLogin.status !== 200)
            throw new HttpErrorInternalServerError(`RestWebService.Connect: ${wsLogin.statusText}`)

        if (!loginEndpointConfig["session-headers"])
            return

        const postHearders = loginEndpointConfig["session-headers"]

        for (const [headerName, headerValue] of Object.entries(postHearders)) {
            const __headerNewValue = PlaceHolder.EvaluateJsCode(
                headerValue,
                new Sandbox({
                    $response: {
                        url: wsLogin.config.url,
                        host: wsLogin.request.host,
                        body: wsLogin.data
                    }
                }))
            this.Client.defaults.headers.common[headerName] = __headerNewValue
        }
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.Out} RestWebService disconnected`)
    }

    @Logger.LogFunction()
    async Create(endpoint: string, data: string): Promise<Readable> {

        if (!this.Endpoints.has(ENDPOINT.ITEM_CREATE) || !this.Client)
            throw new HttpErrorInternalServerError(`RestWebService.Create: undefined endpoint for ${ENDPOINT.ITEM_CREATE}`)

        try {
            const { Method } = this.Endpoints.get(ENDPOINT.ITEM_CREATE)!

            Logger.Debug(`${Logger.In} RestWebService.Create: ${StringHelper.Url(this.ConfigSource!.host, endpoint)}`)
            const wsResp: AxiosResponse = await this.Client({
                method: Method.toLowerCase(),
                url: endpoint,
                data
            })

            if (![200, 201].includes(wsResp.status))
                throw HttpErrorSwitch(wsResp.status, `RestWebService.Create: ${wsResp.statusText}`)

            return Readable.from(JsonHelper.Stringify(wsResp.data))
        } catch (error: any) {
            throw HttpErrorSwitch(error.status, error.message)
        }
    }

    @Logger.LogFunction()
    async Read(endpoint: string): Promise<Readable> {

        if (!this.Endpoints.has(ENDPOINT.COLLECTION_READ) || !this.Client)
            throw new HttpErrorInternalServerError(`RestWebService.Read: undefined endpoint for ${ENDPOINT.COLLECTION_READ}`)

        try {
            const { Method } = this.Endpoints.get(ENDPOINT.COLLECTION_READ)!

            Logger.Debug(`${Logger.In} RestWebService.Read: ${StringHelper.Url(this.ConfigSource!.host, endpoint)}`)
            const wsResp: AxiosResponse = await this.Client({
                method: Method.toLowerCase(),
                url: endpoint
            })

            if (wsResp.status !== 200)
                throw HttpErrorSwitch(wsResp.status, `RestWebService.Read: ${wsResp.statusText}`)

            return Readable.from(JsonHelper.Stringify(wsResp.data))

        } catch (error: any) {
            throw HttpErrorSwitch(error.status, error.message)
        }
    }

    @Logger.LogFunction()
    async Update(endpoint: string, body: string): Promise<Readable> {

        if (!this.Endpoints.has(ENDPOINT.ITEM_UPDATE) || !this.Client)
            throw new HttpErrorInternalServerError(`RestWebService.Update: undefined endpoint for ${ENDPOINT.ITEM_UPDATE}`)

        try {
            const { Method } = this.Endpoints.get(ENDPOINT.ITEM_UPDATE)!

            Logger.Debug(`${Logger.In} RestWebService.Update: ${StringHelper.Url(this.ConfigSource!.host, endpoint)}`)
            const wsResp: AxiosResponse = await this.Client({
                method: Method.toLowerCase(),
                url: endpoint,
                data: body
            })

            if (![200, 204].includes(wsResp.status))
                throw HttpErrorSwitch(wsResp.status, `RestWebService.Update: ${wsResp.statusText}`)

            return Readable.from(JsonHelper.Stringify(wsResp.data))

        } catch (error: any) {
            throw HttpErrorSwitch(error.status, error.message)
        }
    }

    @Logger.LogFunction()
    async Delete(endpoint: string): Promise<Readable> {

        if (!this.Endpoints.has(ENDPOINT.ITEM_DELETE) || !this.Client)
            throw new HttpErrorInternalServerError(`RestWebService.Delete: undefined endpoint for ${ENDPOINT.ITEM_DELETE}`)

        try {
            const { Method } = this.Endpoints.get(ENDPOINT.ITEM_DELETE)!

            Logger.Debug(`${Logger.In} RestWebService.Delete: ${StringHelper.Url(this.ConfigSource!.host, endpoint)}`)
            const wsResp: AxiosResponse = await this.Client({
                method: Method.toLowerCase(),
                url: endpoint
            })

            if (![200, 204].includes(wsResp.status))
                throw HttpErrorSwitch(wsResp.status, `RestWebService.Delete: ${wsResp.statusText}`)

            return Readable.from(JsonHelper.Stringify(wsResp.data))

        } catch (error: any) {
            throw HttpErrorSwitch(error.status, error.message)
        }
    }
}
