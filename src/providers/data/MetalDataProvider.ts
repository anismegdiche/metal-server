 
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
import { TRANSACTION, TSchemaResponse, TSchemaResponseData, TSchemaResponseError } from "../../types/TSchemaResponse"
import { TSourceParams } from "../../types/TSourceParams"
import { TJson } from '../../types/TJson'
import { DataTable } from '../../types/DataTable'
import { SERVER } from '../../lib/Const'
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { HttpErrorInternalServerError, HttpErrorNotImplemented } from "../../server/HttpErrors"


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
    Params: TSourceParams = <TSourceParams>{}
    Config: TJson = {}

    Options = new CommonSqlDataProviderOptions()

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    static #ConvertSchemaRequestToJsonOptions(schemaRequest: TSchemaRequest): object {
        // eslint-disable-next-line you-dont-need-lodash-underscore/omit
        return _.omit(schemaRequest, ['sourceName', 'schemaName', 'entityName'])
    }

    static #ConvertResponseToSchemaRequest(res: AxiosResponse): TSchemaResponse {
        const metalResponse = res.data
        if (metalResponse?.transaction == TRANSACTION.SELECT) {
            const data = new DataTable(
                metalResponse?.entityName,
                metalResponse?.rows,
                metalResponse?.fields,
                metalResponse?.metadata
            )
            return <TSchemaResponseData>{
                ...metalResponse,
                data
            }
        }
        return metalResponse
    }

    static #HandleError(error: AxiosError): TSchemaResponseError {
        if (!error?.response) {
            throw error
        }
        if (error?.response?.data) {
            return error.response.data as TSchemaResponseError
        }
        throw error
    }

    async Init(sourceParams: TSourceParams): Promise<void> {
        Logger.Debug("MetalDataProvider.Init")
        this.Params = sourceParams
    }

    async Connect(): Promise<void> {
        const sourceName = this.SourceName
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
                        Logger.Info(`${Logger.Out} connected to '${sourceName} (${database})'`)
                        const { data } = res
                        if (data?.version != SERVER.VERSION) {
                            Logger.Warn(`⚠️  WARNING ⚠️  The server version for '${sourceName}' (version: ${data?.version}) do not match with current Metal Server (version: ${SERVER.VERSION}). Please proceed with caution.`)
                        }
                    })
                    .catch((error: unknown) => {
                        throw error
                    })
            })
            .catch((error: unknown) => {
                Logger.Error(`${Logger.In} Failed to connect to '${sourceName} (${database})'`)
                Logger.Error(error)
            })
    }

    async Disconnect(): Promise<void> {
        if (this.Connection) {
            this.Connection = undefined
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)

        const url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entityName}`

        return this.Connection.Post(url, options)
            .then(MetalDataProvider.#ConvertResponseToSchemaRequest)
            .catch(MetalDataProvider.#HandleError)
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)
        const urlParams = MetalClient.ConvertToURLParams(options)

        let url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entityName}`

        if (urlParams.length > 0) {
            url += `?${urlParams}`
        }

        return this.Connection.Get(url)
            .then(MetalDataProvider.#ConvertResponseToSchemaRequest)
            .catch(MetalDataProvider.#HandleError)
    }


    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)

        const url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entityName}`

        return await this.Connection.Patch(url, options)
            .then(MetalDataProvider.#ConvertResponseToSchemaRequest)
            .catch(MetalDataProvider.#HandleError)
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)

        const url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entityName}`

        return await this.Connection.Delete(url, options)
            .then(MetalDataProvider.#ConvertResponseToSchemaRequest)
            .catch(MetalDataProvider.#HandleError)
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to connect`)

        const options = MetalDataProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)
        const urlParams = MetalClient.ConvertToURLParams(options)

        let url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}`

        if (urlParams.length > 0) {
            url += `?${urlParams}`
        }

        return this.Connection.Get(url)
            .then(MetalDataProvider.#ConvertResponseToSchemaRequest)
            .catch(MetalDataProvider.#HandleError)
    }
}