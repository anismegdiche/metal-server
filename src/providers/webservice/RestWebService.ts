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
import { HttpErrorBadRequest, HttpErrorInternalServerError } from "../../server/HttpErrors"
import { JsonHelper } from '../../lib/JsonHelper'
import { TJson } from "../../types/TJson"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { Sandbox } from "../../server/Sandbox"
import { RX } from "../../lib/Const"


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
            body?: TJson<string>
            headers?: TJson<string>
        }
        collection?: {
            read: string
        },
        item?: {
            create?: string
            read?: string
            update?: string
            delete?: string
        }
    }
}

type TEndpoint = {
    Url: string
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    Handler: Function
    Key?: string
}

//
export class RestWebService extends absWebServiceProvider {

    DEFAULT: Partial<TConfigSourceWebServiceRest> = {
        endpoints: {}
    }

    ConfigSource?: TConfigSourceWebService
    ConfigSourceOptions?: TConfigSourceWebServiceOptions
    Client = axios.create() as AxiosInstance
    EndPoints = new Map<string, TEndpoint>()
    Headers: Record<string, string>[] = []

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    MethodCaseMap: Record<string, Function> = {
        "GET": (url: string, _body: string) => this.Client.get(url),
        "POST": (url: string, body: string) => this.Client.post(url, body),
        "PUT": (url: string, body: string) => this.Client.put(url, body),
        "DELETE": (url: string, body: string) => this.Client.delete(url, { data: body }),
        "PATCH": (url: string, body: string) => this.Client.patch(url, body)
    }


    constructor() {
        super()
    }

    SetConfig(configSource: TConfigSourceWebService): void {
        super.SetConfig(configSource)

        if (this.ConfigSourceOptions?.endpoints === undefined || this.ConfigSource?.host === undefined)
            throw new HttpErrorBadRequest('RestWebService: No urls defined in config')

        if (typeof this.ConfigSourceOptions.endpoints.collection == "object")
            Object.entries(this.ConfigSourceOptions.endpoints.collection).forEach(([op, opConfig]) => {
                const endpointMethod = (opConfig.split(":").at(0) ?? "GET").toUpperCase()
                const endpointUrl = opConfig.split(":").at(1) ?? ""
                this.EndPoints.set(
                    `collection:${op}`,
                    {
                        Url: endpointUrl,
                        Handler: this.MethodCaseMap[endpointMethod],
                        Key: PlaceHolder.GetVarName(endpointUrl)
                    })
            })

        if (typeof this.ConfigSourceOptions.endpoints.item == "object")
            Object.entries(this.ConfigSourceOptions.endpoints.item).forEach(([op, opConfig]) => {
                const endpointMethod = (opConfig.split(":").at(0) ?? "GET").toUpperCase()
                const endpointUrl = opConfig.split(":").at(1) ?? ""
                this.EndPoints.set(
                    `item:${op}`,
                    {
                        Url: endpointUrl,
                        Handler: this.MethodCaseMap[endpointMethod],
                        Key: PlaceHolder.GetVarName(endpointUrl)
                    })
            })
    }

    @Logger.LogFunction()
    Init(): void {
        if (!this.ConfigSourceOptions?.content)
            return

        this.Client.defaults.baseURL = this.ConfigSource!.host

        const header = Object.keys(HEADER[this.ConfigSourceOptions.content]).at(0)
        const value = Object.values(HEADER[this.ConfigSourceOptions.content]).at(0)

        if (typeof header == 'string' && typeof value == 'string')
            this.Client.defaults.headers.common[header] = value
    }


    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (typeof this.ConfigSourceOptions?.endpoints.login !== 'object')
            return

        const { url, body, headers } = this.ConfigSourceOptions.endpoints.login

        if (!url || !body)
            return

        const endpointMethod = (url.split(":").at(0) ?? "GET").toUpperCase()
        const endpointUrl = url.split(":").at(1) ?? ""

        Logger.Debug(`${Logger.In} RestWebService: Connect ${StringHelper.Url(this.ConfigSource!.host, url)}`)
        const wsLogin = await this.MethodCaseMap[endpointMethod](
            StringHelper.Url(
                this.ConfigSource!.host,
                endpointUrl
            ),
            JsonHelper.Stringify(body)
        )

        if (wsLogin.status !== 200)
            throw new HttpErrorInternalServerError(`RestWebService: ${wsLogin.statusText}`)

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
    async Create(entity: string, body: string): Promise<Readable> {

        if (!this.EndPoints.has(ENDPOINT.ITEM_CREATE))
            throw new HttpErrorInternalServerError(`RestWebService: undefined endpoint for ${ENDPOINT.ITEM_CREATE}`)

        try {
            const { Url, Handler } = this.EndPoints.get(ENDPOINT.ITEM_CREATE)!

            const requestUrl = StringHelper.Url(
                "/",
                entity,
                Url
            )

            Logger.Debug(`${Logger.In} RestWebService: Create ${StringHelper.Url(this.ConfigSource!.host, requestUrl)}`)
            const wsResp: AxiosResponse = await Handler(requestUrl, body)

            if (![200, 201].includes(wsResp.status))
                throw new HttpErrorInternalServerError(`RestWebService: ${wsResp.statusText}`)

            return new Readable(wsResp.data)
        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    @Logger.LogFunction()
    async Read(entity: string): Promise<Readable> {

        if (!this.EndPoints.has(ENDPOINT.COLLECTION_READ))
            throw new HttpErrorInternalServerError(`RestWebService: undefined endpoint for ${ENDPOINT.COLLECTION_READ}`)

        try {
            const { Url, Handler } = this.EndPoints.get(ENDPOINT.COLLECTION_READ)!
            const requestUrl = StringHelper.Url("/", entity, Url)

            Logger.Debug(`${Logger.In} RestWebService: Read ${StringHelper.Url(this.ConfigSource!.host, requestUrl)}`)
            const wsResp: AxiosResponse = await Handler(requestUrl)

            if (wsResp.status !== 200)
                throw new HttpErrorInternalServerError(`RestWebService: ${wsResp.statusText}`)

            return Readable.from(JsonHelper.Stringify(wsResp.data))
        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    @Logger.LogFunction()
    async Update(entity: string, key: string, body: string): Promise<Readable> {

        if (!this.EndPoints.has(ENDPOINT.ITEM_UPDATE))
            throw new HttpErrorInternalServerError(`RestWebService: undefined endpoint for ${ENDPOINT.ITEM_UPDATE}`)

        try {
            const { Url, Handler } = this.EndPoints.get(ENDPOINT.ITEM_UPDATE)!
            const keyName = this.EndPoints.get(ENDPOINT.ITEM_UPDATE)?.Key

            const requestUrl = StringHelper.Url(
                "/",
                entity,
                PlaceHolder.ReplaceVar(Url, keyName, key)
            )

            Logger.Debug(`${Logger.In} RestWebService: Update ${StringHelper.Url(this.ConfigSource!.host, requestUrl)}`)
            const wsResp: AxiosResponse = await Handler(requestUrl, body)

            if (![200, 204].includes(wsResp.status))
                throw new HttpErrorInternalServerError(`RestWebService: ${wsResp.statusText}`)

            return new Readable(wsResp.data)

        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    @Logger.LogFunction()
    async Delete(entity: string, key: string): Promise<Readable> {

        if (!this.EndPoints.has(ENDPOINT.ITEM_DELETE))
            throw new HttpErrorInternalServerError(`RestWebService: undefined endpoint for ${ENDPOINT.ITEM_DELETE}`)

        try {
            const { Url, Handler } = this.EndPoints.get(ENDPOINT.ITEM_DELETE)!
            const keyName = this.EndPoints.get(ENDPOINT.ITEM_DELETE)?.Key

            const requestUrl = StringHelper.Url(
                "/",
                entity,
                PlaceHolder.ReplaceVar(Url, keyName, key)
            )

            Logger.Debug(`${Logger.In} RestWebService: Delete ${StringHelper.Url(this.ConfigSource!.host, requestUrl)}`)
            const wsResp: AxiosResponse = await Handler(requestUrl)

            if (![200, 204].includes(wsResp.status))
                throw new HttpErrorInternalServerError(`RestWebService: ${wsResp.statusText}`)

            return new Readable(wsResp.data)
        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    GetKeyName(endpoint: string): string | undefined {
        return this.EndPoints.get(endpoint)?.Key
    }

    GetHeaders(): Record<string, string> {
        const headers = Object.assign({}, ...this.Headers)
        return { headers }
    }
}
