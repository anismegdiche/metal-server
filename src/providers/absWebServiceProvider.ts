
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


//
export const HEADER: Record<string, Record<string, string>> = {
    [CONTENT.JSON]: { 'Content-Type': 'application/json' }
}


//
export abstract class absWebServiceProvider {

    abstract DEFAULT: unknown
    abstract ConfigSource?: TConfigSourceWebService
    abstract ConfigSourceOptions?: TConfigSourceWebServiceOptions
    abstract Client: unknown

    SetConfig(configSource: TConfigSourceWebService) {
        this.ConfigSource = configSource
        this.ConfigSourceOptions = _.merge(this.DEFAULT, configSource.options)
    }

    abstract Init(): void

    abstract Connect(): Promise<void>
    abstract Disconnect(): Promise<void>
    
    abstract Create(url: string, body: string): Promise<Readable>
    abstract Read(entity: string): Promise<Readable>
    abstract Update(entity: string, key: string | undefined, body: string): Promise<Readable>
    abstract Delete(url: string, key: string | undefined): Promise<Readable>
    
    abstract GetKeyName(endpoint: string): string | undefined

    Clone(): absWebServiceProvider {
        // eslint-disable-next-line you-dont-need-lodash-underscore/clone-deep
        return _.cloneDeep(this) as absWebServiceProvider
    }
}