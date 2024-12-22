//
//
//
//
//
import { Readable } from "stream"
import axios, { AxiosResponse, AxiosInstance } from "axios"
//
import { absWebServiceProvider, HEADER } from "../absWebServiceProvider"
import { TConfigSourceWebServiceOptions, TConfigSourceWebService } from "../data/WebServiceData"
import { Logger } from "../../utils/Logger"
import { StringHelper } from "../../lib/StringHelper"
import { HttpErrorInternalServerError } from "../../server/HttpErrors"
import { JsonHelper } from '../../lib/JsonHelper'
import { TJson } from "../../types/TJson"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { Sandbox } from "../../server/Sandbox"


//
export const enum ENDPOINT {
    COLLECTION_READ = "collection:read",
    ITEM_CREATE = "item:create",
    ITEM_READ = "item:read",
    ITEM_UPDATE = "item:update",
    ITEM_DELETE = "item:delete"
}


//
export type TConfigSourceWebServiceRest = {
    endpoints: {
        login?: {
            url?: string
            //CURRENT change body to data, also config.yml 
            body?: TJson<string>
            headers?: TJson<string>
        }
        collection?: {
            // CURRENT change to object method:url, data
            read: string
        },
        item?: {
            // CURRENT change to object method:url, data
            create?: string
            read?: string
            update?: string
            delete?: string
        }
    }
}


//
export class RestWebService extends absWebServiceProvider {

    DEFAULT: Partial<TConfigSourceWebServiceRest> = {
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

        //TODO to simplify
        if (typeof this.ConfigSourceOptions.endpoints.collection == "object")
            Object.entries(this.ConfigSourceOptions.endpoints.collection).forEach(([op, opConfig]) => {
                const endpointMethod = (opConfig.split(":").at(0) ?? "GET").toUpperCase()
                const endpointUrl = opConfig.split(":").at(1) ?? ""
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
                const endpointMethod = (opConfig.split(":").at(0) ?? "GET").toUpperCase()
                const endpointUrl = opConfig.split(":").at(1) ?? ""
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
    Init(): void {
        if (!this.ConfigSourceOptions?.content)
            return

        this.Client = axios.create()

        this.Client.defaults.baseURL = this.ConfigSource!.host

        // set content type
        const header = Object.keys(HEADER[this.ConfigSourceOptions.content]).at(0)
        const value = Object.values(HEADER[this.ConfigSourceOptions.content]).at(0)

        if (typeof header == 'string' && typeof value == 'string')
            this.Client.defaults.headers.common[header] = value
    }


    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (typeof this.ConfigSourceOptions?.endpoints.login !== 'object'  || !this.Client)
            return

        const { url, body, headers } = this.ConfigSourceOptions.endpoints.login

        if (!url || !body)
            return

        const [endpointMethod = "GET", endpointUrl = "/"] = url.split(":")

        Logger.Debug(`${Logger.In} RestWebService.Connect: ${StringHelper.Url(this.ConfigSource!.host, url)}`)
        const wsLogin = await this.Client({
            method: endpointMethod.toLowerCase(),
            url: StringHelper.Url(
                this.ConfigSource!.host,
                endpointUrl
            ),
            data: JsonHelper.Stringify(body)
        })

        if (wsLogin.status !== 200)
            throw new HttpErrorInternalServerError(`RestWebService.Connect: ${wsLogin.statusText}`)

        if (!headers)
            return

        for (const [headerName, headerValue] of Object.entries(headers)) {
            const __headerNewValue = PlaceHolder.EvaluateJsCode(
                headerValue,
                new Sandbox({
                    $body: wsLogin.data
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

        if (!this.Endpoints.has(ENDPOINT.ITEM_CREATE)  || !this.Client)
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
                throw new HttpErrorInternalServerError(`RestWebService.Create: ${wsResp.statusText}`)

            return Readable.from(JsonHelper.Stringify(wsResp.data))
        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
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
                throw new HttpErrorInternalServerError(`RestWebService.Read: ${wsResp.statusText}`)

            return Readable.from(JsonHelper.Stringify(wsResp.data))

        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
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
                throw new HttpErrorInternalServerError(`RestWebService.Update: ${wsResp.statusText}`)

            return Readable.from(JsonHelper.Stringify(wsResp.data))

        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
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
                throw new HttpErrorInternalServerError(`RestWebService.Delete: ${wsResp.statusText}`)

            return Readable.from(JsonHelper.Stringify(wsResp.data))

        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    GetKeyName(endpoint: string): string[] | undefined {
        return this.Endpoints.get(endpoint)?.Keys
    }
}
