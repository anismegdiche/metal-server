
//
//
//
//
//
import axios, { AxiosError, AxiosResponse } from 'axios'
import _ from 'lodash'
//
import { Logger } from "../../utils/Logger"
import DATA_PROVIDER from "../../server/Source"
import * as IDataProvider from "../../types/IDataProvider"
import { TSchemaRequest } from "../../types/TSchemaRequest"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TConfigSource } from "../../types/TConfig"
import { TJson } from '../../types/TJson'
import { DataTable } from '../../types/DataTable'
import { HTTP_STATUS_CODE, SERVER } from '../../lib/Const'
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { HttpErrorBadRequest, HttpErrorForbidden, HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented, HttpErrorUnauthorized } from "../../server/HttpErrors"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"


type TMetalClientParams = {
    host: string
    user?: string
    password?: string
    database?: string
}

export class MetalClient {
    Params: TMetalClientParams = {
        host: "http://localhost:3000",
        user: undefined,
        password: undefined,
        database: undefined
    }

    Authentication = false
    #Token?: string = undefined

    Request = axios

    API: TJson = {
        user: "/user",
        server: "/server",
        schema: "/schema",
        plan: "/plan",
        cache: "/cache"
    }

    constructor(metalClientParams: TMetalClientParams) {
        this.Params = metalClientParams
        if (this.Params.user !== undefined && this.Params.password !== undefined) {
            this.Authentication = true
            this.Login(this.Params.user, this.Params.password)
        }
    }

    #SetHeaders(): { headers: any } {
        let headers: { [key: string]: string } = { 'Content-Type': 'application/json' }
        if (this.#Token !== undefined) {
            headers = {
                ...headers,
                'Authorization': `Bearer ${this.#Token}`
            }
        }
        return { headers }
    }

    @Logger.LogFunction()
    static ConvertToURLParams(jsonObj: object): string {
        const params: string[] = []
        for (const [_key, _value] of Object.entries(jsonObj)) {
            if (_value != null) {
                params.push(`${encodeURIComponent(_key)}=${encodeURIComponent(_value.toString())}`)
            }
        }
        return params.join('&')
    }

    async Login(username: string, password: string): Promise<void> {
        this.Params.user = username
        this.Params.password = password
        const response = await this.Post(`${this.Params.host}${this.API.user}/login`, {
            username,
            password
        })
        if (!response?.data?.token) {
            throw new HttpErrorInternalServerError('Token not found in response')
        }
        const { token } = response.data
        this.#Token = token
    }

    async Post(url: string, body: any | null = null): Promise<AxiosResponse> {
        return this.Request.post(url, body, this.#SetHeaders())
            .then(response => response)
            .catch(error => {
                throw error
            })
    }

    async Get(url: string): Promise<AxiosResponse> {
        return this.Request.get(url, this.#SetHeaders())
            .then(response => response)
            .catch(error => {
                throw error
            })
    }

    async Patch(url: string, body: any | null = null): Promise<AxiosResponse> {
        return this.Request.patch(url, body, this.#SetHeaders())
            .then(response => response)
            .catch(error => {
                throw error
            })
    }

    async Delete(url: string, body: any | null = null): Promise<AxiosResponse> {
        return this.Request.delete(url, {
            headers: this.#SetHeaders().headers,
            data: body
        })
            .then(response => response)
            .catch(error => {
                throw error
            })
    }
}

export class MetalDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.METAL
    Connection?: MetalClient = undefined
    SourceName: string
    Params: TConfigSource = <TConfigSource>{}
    Config: TJson = {}

    Options = new CommonSqlDataProviderOptions()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static readonly #ErrorCaseMap: Record<number, Function> = {
        [HTTP_STATUS_CODE.BAD_REQUEST as number]: (message: string) => new HttpErrorBadRequest(message),
        [HTTP_STATUS_CODE.UNAUTHORIZED as number]: (message: string) => new HttpErrorUnauthorized(message),
        [HTTP_STATUS_CODE.FORBIDDEN as number]: (message: string) => new HttpErrorForbidden(message),
        [HTTP_STATUS_CODE.NOT_FOUND as number]: (message: string) => new HttpErrorNotFound(message),
        [HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR as number]: (message: string) => new HttpErrorInternalServerError(message),
        [HTTP_STATUS_CODE.NOT_IMPLEMENTED as number]: (message: string) => new HttpErrorNotImplemented(message)
    }


    constructor(source: string, sourceParams: TConfigSource) {
        this.SourceName = source
        this.Init(sourceParams)
        this.Connect()
    }

    static #ConvertSchemaRequestToJsonOptions(schemaRequest: TSchemaRequest): object {
        // eslint-disable-next-line you-dont-need-lodash-underscore/omit
        return _.omit(schemaRequest, ['source', 'schema', 'entity'])
    }

    static #ConvertResponseToSchemaResponse(res: AxiosResponse): TSchemaResponse {
        const metalResponse = res.data
        if (res.status == HTTP_STATUS_CODE.OK) {
            const data = new DataTable(
                metalResponse?.entity,
                metalResponse?.rows,
                metalResponse?.fields,
                metalResponse?.metadata
            )
            return <TSchemaResponse>{
                ...metalResponse,
                data
            }
        }
        return metalResponse
    }

    // static #ConvertResponseToInternalResponse(res: AxiosResponse): TInternalResponse<TSchemaResponse> {

    //     const status = res.status
    //     const body = res.data

    //     if (status == HTTP_STATUS_CODE.OK) {
    //         const data = new DataTable(
    //             body?.entity,
    //             body?.rows,
    //             body?.fields,
    //             body?.metadata
    //         )
    //         body.data = data
    //     }

    //     return <TInternalResponse<TSchemaResponse>>{
    //         StatusCode: status,
    //         Body: body
    //     }
    // }

    static #ThrowError(error: AxiosError): undefined {
        if (error?.response?.status)
            this.#ErrorCaseMap[error?.response?.status](error.message)

        throw error
    }

    async Init(sourceParams: TConfigSource): Promise<void> {
        Logger.Debug("MetalDataProvider.Init")
        this.Params = sourceParams
    }

    async Connect(): Promise<void> {
        const source = this.SourceName
        const {
            user = '',
            password = '',
            host = 'http://localhost:3000',
            database = ''
        } = this.Params

        this.Connection = new MetalClient({
            host,
            user,
            password,
            database
        })

        this.Connection.Login(user, password)
            .then(() => {
                this.Connection?.Get(`${this.Params.host}${this.Connection.API.server}/info`)
                    .then((res: AxiosResponse) => {
                        Logger.Info(`${Logger.Out} connected to '${source} (${database})'`)
                        const { data } = res
                        if (data?.version != SERVER.VERSION) {
                            Logger.Warn(`⚠️  WARNING ⚠️  The server version for '${source}' (version: ${data?.version}) do not match with current Metal Server (version: ${SERVER.VERSION}). Please proceed with caution.`)
                        }
                    })
                    .catch((error: unknown) => {
                        throw error
                    })
            })
            .catch((error: unknown) => {
                Logger.Error(`${Logger.In} Failed to connect to '${source} (${database})'`)
                Logger.Error(error)
            })
    }

    async Disconnect(): Promise<void> {
        if (this.Connection) {
            this.Connection = undefined
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)

        const url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entity}`

        await this.Connection.Post(url, options)
            .catch(MetalDataProvider.#ThrowError)

        return HttpResponse.NoContent()
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)
        const urlParams = MetalClient.ConvertToURLParams(options)

        let url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entity}`

        if (urlParams.length > 0) {
            url += `?${urlParams}`
        }

        const schemaResponse = await this.Connection.Get(url)
            .then(MetalDataProvider.#ConvertResponseToSchemaResponse)
            .catch(MetalDataProvider.#ThrowError)

        return HttpResponse.Ok(schemaResponse as TSchemaResponse)
    }


    async Update(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)

        const url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entity}`

        await this.Connection.Patch(url, options)
            .catch(MetalDataProvider.#ThrowError)

        return HttpResponse.NoContent()
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)

        const url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entity}`

        await this.Connection.Delete(url, options)
            .catch(MetalDataProvider.#ThrowError)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)
        const urlParams = MetalClient.ConvertToURLParams(options)

        let url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}`

        if (urlParams.length > 0) {
            url += `?${urlParams}`
        }

        const schemaResponse = await this.Connection.Get(url)
            .then(MetalDataProvider.#ConvertResponseToSchemaResponse)
            .catch(MetalDataProvider.#ThrowError)

        return HttpResponse.Ok(schemaResponse as TSchemaResponse)
    }
}