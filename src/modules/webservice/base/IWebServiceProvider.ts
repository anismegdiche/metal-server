//
//
//
import { Readable } from "stream"
//
import { TConfigSourceWebService, TWebServiceDataOptions } from "../../source/providers/WebServiceData"
import { TContext } from "../../sandbox/types/TContext"
import { TJson } from "../../../types/TJson"
import { TWebServiceEndpoint, TEndpoint } from "../@types"
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
}
