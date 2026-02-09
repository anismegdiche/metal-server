//
//
//
import { Readable } from "node:stream"
//
import type { TConfigSourceWebService, TWebServiceDataOptions } from "../../source/providers/WebServiceData"
import type { TContext } from "../../sandbox/types/TContext"
import type { TJson } from "../../../types/TJson"
import type { TWebServiceEndpoint, TEndpoint } from "../@types"
import { clsClonable } from "../../../utils/base/clsClonable"


//
export interface IWebServiceProvider extends clsClonable {
    DEFAULT: unknown
    ConfigSource?: TConfigSourceWebService
    ConfigSourceOptions?: TWebServiceDataOptions
    Client?: unknown
    Endpoints: Map<string, TEndpoint>

    SetConfig(configSource: TConfigSourceWebService): void
    Init(): Promise<void>
    Connect(): Promise<void>
    Disconnect(): Promise<void>
    Read($context: Partial<TContext>): Promise<Readable>
    Create(data: TJson, $context: Partial<TContext>): Promise<Readable>
    Update(data: TJson, $context: Partial<TContext>): Promise<Readable>
    Delete($context: Partial<TContext>): Promise<Readable>
    ProcessEndpoint(endpointType: string, endpointConfig: TWebServiceEndpoint): void
    IsEndpoint(v: unknown): v is TEndpoint
}
