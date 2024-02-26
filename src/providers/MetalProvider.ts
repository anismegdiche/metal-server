/* eslint-disable init-declarations */
//
//
//
//
//
import axios, { AxiosError, AxiosResponse } from 'axios'
import _ from 'lodash'
//
import { Logger } from "../lib/Logger"
import PROVIDER from "../server/Source"
import * as IProvider from "../types/IProvider"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TRANSACTION, TSchemaResponse, TSchemaResponseData, TSchemaResponseError } from "../types/TSchemaResponse"
import { TSourceParams } from "../types/TSourceParams"
import { CommonSqlProviderOptions } from "./CommonSqlProvider"
import { TJson } from '../types/TJson'
import { DataTable } from '../types/DataTable'
import { SERVER } from '../lib/Const'


/////////////////////


type TMetalClientParams = {
    host: string
    user?: string
    password?: string
    database?: string
}

//XXX: interface MetalClientResponse {
//XXX:     status: number
//XXX:     data: any
//XXX: }

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
        let _headers: { [key: string]: string } = { 'Content-Type': 'application/json' }
        if (this.#Token !== undefined) {
            _headers = {
                ..._headers,
                'Authorization': `Bearer ${this.#Token}`
            }
        }
        return { headers: _headers }
    }

    //XXX: #CallbackFailed(error: any): any {
    //XXX:     if (error?.response?.data?.result === "error") {
    //XXX:         Logger.Error(JSON.stringify(error?.response?.data))
    //XXX:     }
    //XXX:     return error?.response?.data
    //XXX: }

    static ConvertToURLParams(jsonObj: object): string {
        const params: string[] = []
        for (const [key, value] of Object.entries(jsonObj)) {
            if (value != null) {
                params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`)
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
            throw new Error('Token not found in response')
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

/////////////////////

//XXX: export type TMetalProviderOptions = {
//XXX:     autoCreate?: boolean
//XXX: }

export class MetalProvider implements IProvider.IProvider {
    ProviderName = PROVIDER.METAL
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Primitive = MetalClient
    Connection?: MetalClient = undefined
    Config: TJson = {}

    Options = new CommonSqlProviderOptions()

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    static #ConvertSchemaRequestToJsonOptions(schemaRequest: TSchemaRequest): object {
        return _.chain(schemaRequest)
            .omit('sourceName')
            .omit('schemaName')
            .omit('entityName')
            .value()
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
        Logger.Debug("MetalProvider.Init")
        this.Params = sourceParams
        //XXX: this.SourceName = sourceName
        //XXX: this.Init(sourceParams)
        //XXX: this.Connect()      
        //XXX: this.Params = sourceParams
        //XXX: const {
        //XXX:     storageType = STORAGE.FILESYSTEM,
        //XXX:     contentType = CONTENT.JSON
        //XXX: } = this.Params.options as TMetalProviderOptions
        //XXX: this.Primitive = new MetalClient(this.Params)        
        //XXX: if (this.Primitive)
        //XXX:     this.Primitive.Init()
        //XXX: else
        //XXX:     throw new Error(`${this.SourceName}: Failed to initialize storage provider`)

    }

    async Connect(): Promise<void> {
        const sourceName = this.SourceName
        const {
            user = '',
            password = '',
            host = 'http://localhost:3000',
            database = ''
        } = this.Params

        this.Connection = new this.Primitive({
            host,
            user,
            password,
            database
        })

        this.Connection.Login(user, password)
            .then(() => {
                Logger.Info(`${Logger.In} connected to '${sourceName} (${database})'`)
                this.Connection?.Get(`${this.Params.host}${this.Connection.API.server}/info`)
                    .then((res: AxiosResponse) => {
                        const { data } = res
                        if (data?.version != SERVER.VERSION) {
                            Logger.Warn(`⚠️  WARNING ⚠️  The server version for '${sourceName}' (version: ${data?.version}) do not match with current Metal Server (version: ${SERVER.VERSION}). Please proceed with caution.`)
                        }
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
        Logger.Debug(`${Logger.In} MetalProvider.Insert: ${JSON.stringify(schemaRequest)}`)

        if (this.Connection === undefined) {
            throw new Error(`${this.SourceName}: Failed to connect`)
        }

        const options = MetalProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)

        const url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entityName}`

        return this.Connection.Post(url, options)
            .then(MetalProvider.#ConvertResponseToSchemaRequest)
            .catch(MetalProvider.#HandleError)
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} MetalProvider.Select: ${JSON.stringify(schemaRequest)}`)

        if (this.Connection === undefined) {
            throw new Error(`${this.SourceName}: Failed to connect`)
        }

        const options = MetalProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)
        const urlParams = MetalClient.ConvertToURLParams(options)

        let url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entityName}`

        if (urlParams.length > 0) {
            url += `?${urlParams}`
        }

        return this.Connection.Get(url)
            .then(MetalProvider.#ConvertResponseToSchemaRequest)
            .catch(MetalProvider.#HandleError)
    }


    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} MetalProvider.Update: ${JSON.stringify(schemaRequest)}`)

        if (this.Connection === undefined) {
            throw new Error(`${this.SourceName}: Failed to connect`)
        }

        const options = MetalProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)

        const url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entityName}`

        return await this.Connection.Patch(url, options)
            .then(MetalProvider.#ConvertResponseToSchemaRequest)
            .catch(MetalProvider.#HandleError)
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.In} MetalProvider.Delete: ${JSON.stringify(schemaRequest)}`)

        if (this.Connection === undefined) {
            throw new Error(`${this.SourceName}: Failed to connect`)
        }

        const options = MetalProvider.#ConvertSchemaRequestToJsonOptions(schemaRequest)

        const url = `${this.Params.host}${this.Connection.API.schema}/${this.Params.database}/${schemaRequest.entityName}`

        return await this.Connection.Delete(url, options)
            .then(MetalProvider.#ConvertResponseToSchemaRequest)
            .catch(MetalProvider.#HandleError)
    }
}