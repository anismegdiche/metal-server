//
//
//
import type { Readable } from "node:stream"
import type { TJson } from "@metal/types"
import type { clsClonable } from "../../../utils/base/clsClonable"
import type { TContext } from "../../sandbox/types/TContext"
//
import type { U__source_webservice } from "../../source/types/U__source_webservice"
import type { U__source_webservice_options } from "../../source/types/U__source_webservice_options"
import type { TEndpoint, TWebServiceEndpoint } from "../@types"


//
export interface IWebServiceProvider extends clsClonable {
	DEFAULT: unknown
	ConfigSource?: U__source_webservice
	ConfigSourceOptions?: U__source_webservice_options
	Client?: unknown
	Endpoints: Map<string, TEndpoint>

	SetConfig(configSource: U__source_webservice): void
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
