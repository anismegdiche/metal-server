
//
//
//
//
//
import _ from "lodash"
import { Readable } from "node:stream"
import axios from "axios"
//
import { TConfigSourceWebServiceOptions, TConfigSourceWebService } from "./data/WebServiceData"
import { CONTENT } from "./ContentProvider"


//
export const HEADER: Record<string, Record<string, string>> = {
    [CONTENT.JSON]: { 'Content-Type': 'application/json' }
}

export type TEndpoint = {
    Method: string
    Url: string
    Keys?: string[]
}


//
export abstract class absWebServiceProvider {

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

    Clone(): absWebServiceProvider {
        // eslint-disable-next-line you-dont-need-lodash-underscore/clone-deep
        const clone: absWebServiceProvider = _.cloneDeep(this)
        clone.Client = axios.create()
        return clone
    }
}