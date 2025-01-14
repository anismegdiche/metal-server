
//
//
//
//
//
import _ from "lodash"
import { Readable } from "node:stream"
import typia from "typia"
//
import { CONTENT } from "./ContentProvider"
import { clsClonable } from "../utils/clsClonable"
import { TConfigSourceWebServiceOptions, TConfigSourceWebService } from "./data/WebServiceData"
import { TJson } from "../types/TJson"
import { PlaceHolder } from "../utils/PlaceHolder"


//
export const enum ENDPOINT {
    COLLECTION_READ = "collection:read",
    ITEM_CREATE = "item:create",
    ITEM_READ = "item:read",
    ITEM_UPDATE = "item:update",
    ITEM_DELETE = "item:delete"
}


//
export const HEADER: Record<string, Record<string, string>> = {
    [CONTENT.JSON]: { 'Content-Type': 'application/json' },
    [CONTENT.XML]: {}
}

export type TEndpoint = {
    Method: string
    Url: string
    Keys?: string[]
    DataPath?: string
}

export type TWebServiceEndpointMethod = {
    [method: string]: {
        request?: string
        data?: TJson
        response?: string
        "session-headers"?: TJson<string>
    } | null
}

export type TWebServiceEndpointMethodConfig = TWebServiceEndpointMethod[string]


//
export abstract class absWebServiceProvider extends clsClonable {

    abstract DEFAULT: unknown
    abstract ConfigSource?: TConfigSourceWebService
    abstract ConfigSourceOptions?: TConfigSourceWebServiceOptions
    abstract Client: unknown
    // deepcode ignore CollectionUpdatedButNeverQueried: abstract class
    Endpoints = new Map<string, TEndpoint>()

    SetConfig(configSource: TConfigSourceWebService) {
        this.ConfigSource = configSource
        this.ConfigSourceOptions = _.merge(this.DEFAULT, configSource.options)
    }

    abstract Init(): void

    abstract Connect(): Promise<void>
    abstract Disconnect(): Promise<void>

    abstract Create(endpoint: string, body: string): Promise<Readable>
    abstract Read(endpoint: string): Promise<Readable>
    abstract Update(endpoint: string, body: string): Promise<Readable>
    abstract Delete(endpoint: string): Promise<Readable>

    ProcessEndpoints(endpointsType: string, endpointsConfig: any): void {
        if (!typia.is<Record<string, TWebServiceEndpointMethod>>(endpointsConfig))
            return

        (Object.entries(endpointsConfig)).forEach(([op, opEndpoint]: [string, TWebServiceEndpointMethod]) => {
            if (!opEndpoint || Object.values(opEndpoint).length === 0)
                return

            const [endpointMethod] = Object.keys(opEndpoint)
            const endpointConfig: TWebServiceEndpointMethodConfig = opEndpoint[endpointMethod]

            // default values
            const _endpointConfig = _.merge(
                {
                    request: "/"
                },
                endpointConfig
            )

            this.Endpoints.set(
                `${endpointsType}:${op}`,
                <TEndpoint>{
                    Method: endpointMethod,
                    Url: _endpointConfig.request,
                    Keys: PlaceHolder.GetVarName(_endpointConfig.request),
                    DataPath: _endpointConfig.response
                }
            )
        })
    }
}