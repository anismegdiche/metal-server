//
//
//
import { Readable } from "node:stream"
import { Logger } from "@metal/logger"
import type { TJson } from "@metal/types"
import { JsonUtils } from "@metal/utils"
import type { AxiosError } from "axios"
import { merge } from "lodash-es"
//
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { User } from "../../auth/User"
import { CONTENT } from "../../content/@consts"
import { HttpErrorInternalServerError, HttpErrorSwitch } from "../../errors/HttpErrors"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import type { U__source_webservice } from "../../source/types/U__source_webservice"
import type { U__source_webservice_options } from "../../source/types/U__source_webservice_options"
import { ENDPOINT, HEADER } from "../@consts"
import { absWebServiceProvider } from "../base/absWebServiceProvider"

//
export class SoapWebService extends absWebServiceProvider {
	DEFAULT: Partial<U__source_webservice_options> = {
		"content-type": CONTENT.XML,
	}

	ConfigSource?: U__source_webservice
	ConfigSourceOptions?: U__source_webservice_options
	Client?: import("soap").Client

	_soapOptions: import("soap").IOptions = {}

	Headers: Record<string, string>[] = []

	private static _soapModule: typeof import("soap")
	private static async _loadSoapModule(): Promise<typeof import("soap")> {
		if (!SoapWebService._soapModule) {
			SoapWebService._soapModule = await import("soap")
		}
		return SoapWebService._soapModule
	}

	SetConfig(configSource: U__source_webservice): void {
		super.SetConfig(configSource)
	}

	@Logger.LogFunction()
	async Init(): Promise<void> {
		const endpoint = this.Endpoints.get(ENDPOINT.SESSION)

		if (this.IsEndpoint(endpoint)) {
			const { Data } = this.Endpoints.get(ENDPOINT.SESSION)!
			if (User.IsUserCredentials(Data)) {
				const { username, password } = Data
				const auth = Buffer.from(`${username}:${password}`).toString("base64")
				this._soapOptions = {
					wsdl_headers: {
						Authorization: `Basic ${auth}`,
					},
				}
			}
		}
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<U__source_webservice>(this.ConfigSource, "host is not configured")

		const { host } = this.ConfigSource
		Assert.Var<string>(host, "host is undefined")

		const { "content-type": content } = this.ConfigSourceOptions as U__source_webservice_options
		Assert.Var<string>(content, "content is undefined")

		const soap = await SoapWebService._loadSoapModule()

		this.Client = Assert.Get<import("soap").Client>(
			await soap.createClientAsync(host, this._soapOptions),
			`SoapWebService.Init: Failed to create client`,
		)

		// set content type
		const [header] = Object.keys(HEADER[content]!)
		const [value] = Object.values(HEADER[content]!)

		if (typeof header === "string" && typeof value === "string") this.Client.addHttpHeader(header, value)
		Logger.Debug(`${Logger.Out} SoapWebService connected`)
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		Logger.Debug(`${Logger.Out} SoapWebService disconnected`)
	}

	async RequestClient(endpointType: ENDPOINT, data?: TJson, $context?: Partial<TContext>): Promise<Readable> {
		if (!this.Client) throw new HttpErrorInternalServerError(`SOAP:${endpointType}: Client is not initialized`)

		if (!this.Endpoints.has(endpointType))
			throw new HttpErrorInternalServerError(`${endpointType}: undefined endpoint for ${endpointType}`)

		try {
			const { Method, Data, SessionHeaders, DataPath } = this.Endpoints.get(endpointType)!

			const $__method = PlaceHolder.EvaluateJsCode<string>(Method, new Sandbox($context))
			const $__data = PlaceHolder.EvaluateJsCode<TJson>(Data ?? data, new Sandbox($context)) ?? {}
			const $__dataPath = PlaceHolder.EvaluateJsCode<string>(DataPath, new Sandbox($context))

			Logger.Debug(`${Logger.In} ${endpointType}: ${this.ConfigSource?.host}, ${$__method}`)

			const wsResp = await this.Client[`${$__method}Async`]($__data)

			if (!wsResp) throw new HttpErrorInternalServerError(`${endpointType}: ${wsResp?.statusText}`)

			$context = merge($context, <Partial<TContext>>{
				$request: {
					"data-path": $__dataPath,
				},
				$response: {
					url: this.ConfigSource?.host,
					host: this.ConfigSource?.host,
					body: wsResp.at(1),
				},
			})

			// set session headers after request
			const $__sessionHeaders = PlaceHolder.EvaluateJsCode<TJson<string>>(SessionHeaders, new Sandbox($context))
			if ($__sessionHeaders) {
				for (const [_headerName, _headerValue] of Object.entries($__sessionHeaders)) {
					this.Client.addHttpHeader(_headerName, _headerValue)
				}
			}

			return Readable.from(JsonUtils.Stringify(wsResp.at(1)))
		} catch (e: unknown) {
			const _e: AxiosError = e as AxiosError
			throw HttpErrorSwitch(_e.status, _e.message)
		}
	}

	@Logger.LogFunction()
	async Read($context: Partial<TContext>): Promise<Readable> {
		return this.RequestClient(ENDPOINT.COLLECTION_READ, undefined, $context)
	}

	@Logger.LogFunction()
	async Create(data: TJson, $context: Partial<TContext>): Promise<Readable> {
		return this.RequestClient(ENDPOINT.ITEM_CREATE, data, $context)
	}

	@Logger.LogFunction()
	async Update(data: TJson, $context: Partial<TContext>): Promise<Readable> {
		return this.RequestClient(ENDPOINT.ITEM_UPDATE, data, $context)
	}

	@Logger.LogFunction()
	async Delete($context: Partial<TContext>): Promise<Readable> {
		return this.RequestClient(ENDPOINT.ITEM_DELETE, undefined, $context)
	}
}
