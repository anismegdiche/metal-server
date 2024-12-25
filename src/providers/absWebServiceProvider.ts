
//
//
//
//
//
import _ from "lodash"
import { Readable } from "node:stream"
//
import { TConfigSourceWebServiceOptions, TConfigSourceWebService } from "./data/WebServiceData"
import { CONTENT } from "./ContentProvider"
import { clsClonable } from "../utils/clsClonable"


//
export const HEADER: Record<string, Record<string, string>> = {
    [CONTENT.JSON]: { 'Content-Type': 'application/json' },
    [CONTENT.XML]: {}
}


export type TUrlMethod =
    | { get?: string; post?: never; put?: never; patch?: never; delete?: never }
    | { get?: never; post?: string; put?: never; patch?: never; delete?: never }
    | { get?: never; post?: never; put?: string; patch?: never; delete?: never }
    | { get?: never; post?: never; put?: never; patch: string; delete?: never }
    | { get?: never; post?: never; put?: never; patch?: never; delete: string }

export type TEndpoint = {
    Method: string
    Url: string
    Keys?: string[]
}


//
export abstract class absWebServiceProvider extends clsClonable {

    abstract DEFAULT: unknown
    abstract ConfigSource?: TConfigSourceWebService
    abstract ConfigSourceOptions?: TConfigSourceWebServiceOptions
    abstract Client: unknown
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

    abstract GetKeyName(endpoint: string): string[] | undefined
}