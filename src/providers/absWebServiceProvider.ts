
//
//
//
//
//
import _ from "lodash"
import { Readable } from "node:stream"
//
import { CONTENT } from "./ContentProvider"
import { clsClonable } from "../utils/clsClonable"
import { TWebServiceDataOptions, TConfigSourceWebService } from "./data/WebServiceData"
import { TJson } from "../types/TJson"
import { PlaceHolder } from "../utils/PlaceHolder"
import { HttpErrorInternalServerError } from "../server/HttpErrors"
import { TContext } from "../@types/TContext"


//
export enum ENDPOINT {
    // login
    SESSION = "session",
    // crud
    COLLECTION_READ = "collection-read",
    COLLECTION_CREATE = "collection-create",
    COLLECTION_UPDATE = "collection-update",
    COLLECTION_DELETE = "collection-delete",
    // dal
    COLLECTION_LIST = "collection-list",
    // crud
    ITEM_READ = "item-read",
    ITEM_CREATE = "item-create",
    ITEM_UPDATE = "item-update",
    ITEM_DELETE = "item-delete"
}


//
export const HEADER: Record<string, Record<string, string>> = {
    [CONTENT.JSON]: { 'Content-Type': 'application/json' },
    [CONTENT.XML]: {}
}

export type TEndpoint = {
    Method: string
    Url: string
    Data: TJson | string
    SessionHeaders?: TJson<string>
    Keys?: string[]
    DataPath?: string
}

export type TWebServiceEndpoint = {
    [method: string]: TJson<string> | string | null | undefined
} & {
    data?: TJson
    response?: string
    "session-headers"?: TJson<string>
}


//
export abstract class absWebServiceProvider extends clsClonable {

    abstract DEFAULT: unknown
    abstract ConfigSource?: TConfigSourceWebService
    abstract ConfigSourceOptions?: TWebServiceDataOptions
    abstract Client?: unknown
    // deepcode ignore CollectionUpdatedButNeverQueried: abstract class
    Endpoints = new Map<string, TEndpoint>()

    SetConfig(configSource: TConfigSourceWebService) {
        this.ConfigSource = configSource
        this.ConfigSourceOptions = _.merge(this.DEFAULT, configSource.options)

        if (this.ConfigSourceOptions?.endpoints === undefined || this.ConfigSource?.host === undefined)
            throw new HttpErrorInternalServerError(`${this.constructor.name}: No urls defined in config for web service provider`)

        const endpointsNames: string[] = Object
            .keys(this.ConfigSourceOptions.endpoints)
            .filter(endpointName => Object.values(ENDPOINT).includes(endpointName as ENDPOINT))

        endpointsNames.forEach((endpointName: string) => {
            const endpointConfig = this.ConfigSourceOptions?.endpoints?.[endpointName as keyof typeof this.ConfigSourceOptions.endpoints]
            if (endpointConfig)
                this.ProcessEndpoint(endpointName, endpointConfig)
        })
    }

    abstract Init(): Promise<void>

    abstract Connect(): Promise<void>
    abstract Disconnect(): Promise<void>

    abstract Read($context: Partial<TContext>): Promise<Readable>
    abstract Create(data: TJson, $context: Partial<TContext>): Promise<Readable>
    abstract Update(data: TJson, $context: Partial<TContext>): Promise<Readable>
    abstract Delete($context: Partial<TContext>): Promise<Readable>

    ProcessEndpoint(endpointType: string, endpointConfig: TWebServiceEndpoint): void {

        // get method from key
        const endpointMethod = Object.keys(
            // eslint-disable-next-line you-dont-need-lodash-underscore/omit
            _.omit(endpointConfig, ["data", "response", "session-headers"])
        ).at(0)

        if (!endpointMethod)
            return

        const _Url = <string>endpointConfig[endpointMethod] ?? "/"

        this.Endpoints.set(
            endpointType,
            <TEndpoint>{
                Method: endpointMethod,
                Url: _Url,
                Data: endpointConfig.data,
                SessionHeaders: endpointConfig["session-headers"],
                Keys: PlaceHolder.GetVarName(_Url),
                DataPath: endpointConfig.response
            }
        )
    }
}