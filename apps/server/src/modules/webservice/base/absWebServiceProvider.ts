//
//
//

import type { Readable } from "node:stream"
import { merge, omit } from "lodash-es"
//
import type { TJson } from "@metal/types"
import { clsClonable } from "../../../utils/base/clsClonable"
import { HttpErrorInternalServerError } from "../../errors/HttpErrors"
import type { TContext } from "../../sandbox/types/TContext"
import type { U__source_webservice } from "../../source/types/U__source_webservice"
import type { U__source_webservice_options } from "../../source/types/U__source_webservice_options"
import { ENDPOINT } from "../@consts"
import { type TEndpoint, type TWebServiceEndpoint, z_TEndpoint } from "../@types"
import type { IWebServiceProvider } from "./IWebServiceProvider"

//
export abstract class absWebServiceProvider extends clsClonable implements IWebServiceProvider {
	abstract DEFAULT: unknown
	abstract ConfigSource?: U__source_webservice
	abstract ConfigSourceOptions?: U__source_webservice_options
	abstract Client?: unknown
	// deepcode ignore CollectionUpdatedButNeverQueried: abstract class
	Endpoints = new Map<string, TEndpoint>()

	SetConfig(configSource: U__source_webservice) {
		this.ConfigSource = configSource
		this.ConfigSourceOptions = merge(this.DEFAULT, configSource.options)

		if (this.ConfigSourceOptions?.endpoints === undefined || this.ConfigSource?.host === undefined)
			throw new HttpErrorInternalServerError(
				`${this.constructor.name}: No urls defined in config for web service provider`,
			)

		const endpointsNames: string[] = Object.keys(this.ConfigSourceOptions.endpoints).filter((endpointName) =>
			Object.values(ENDPOINT).includes(endpointName as ENDPOINT),
		)

		endpointsNames.forEach((endpointName: string) => {
			const endpointConfig =
				this.ConfigSourceOptions?.endpoints?.[endpointName as keyof typeof this.ConfigSourceOptions.endpoints]
			if (endpointConfig) this.ProcessEndpoint(endpointName, endpointConfig)
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
		const endpointMethod = Object.keys(omit(endpointConfig, ["data", "response", "session-headers"])).at(0)

		if (!endpointMethod) return

		const _Url = <string>endpointConfig[endpointMethod] ?? "/"

		this.Endpoints.set(endpointType, <TEndpoint>{
			Method: endpointMethod,
			Url: _Url,
			Data: endpointConfig.data,
			SessionHeaders: endpointConfig["session-headers"],
			DataPath: endpointConfig.response,
		})
	}

	IsEndpoint(v: unknown): v is TEndpoint {
		return z_TEndpoint.safeParse(v).success
	}
}
