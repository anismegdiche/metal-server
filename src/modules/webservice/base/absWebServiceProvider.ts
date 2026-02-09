//
//
//
import { merge, omit } from 'lodash-es'
import { Readable } from "node:stream"
//
import type { TJson } from "../../../types/TJson"
import { clsClonable } from "../../../utils/base/clsClonable"
import { HttpErrorInternalServerError } from "../../errors/HttpErrors"
import type { TContext } from "../../sandbox/types/TContext"
import type { TConfigSourceWebService, TWebServiceDataOptions } from "../../source/providers/WebServiceData"
import { ENDPOINT } from "../@consts"
import { z_TEndpoint, type TEndpoint, type TWebServiceEndpoint } from "../@types"
import type { IWebServiceProvider } from "./IWebServiceProvider"


//
export abstract class absWebServiceProvider extends clsClonable implements IWebServiceProvider { //NOSONAR

    abstract DEFAULT: unknown
    abstract ConfigSource?: TConfigSourceWebService
    abstract ConfigSourceOptions?: TWebServiceDataOptions
    abstract Client?: unknown
    // deepcode ignore CollectionUpdatedButNeverQueried: abstract class
    Endpoints = new Map<string, TEndpoint>()

    SetConfig(configSource: TConfigSourceWebService) {
        this.ConfigSource = configSource
        this.ConfigSourceOptions = merge(this.DEFAULT, configSource.options)

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
            omit(endpointConfig, ["data", "response", "session-headers"])
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
                DataPath: endpointConfig.response
            }
        )
    }

    IsEndpoint(v: unknown): v is TEndpoint {
        return z_TEndpoint.safeParse(v).success
    }
}