//
//
//
import { merge } from "lodash-es"
//
import { DataTable, type TRowsCopyParams } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
import { Assert } from "../../../utils/Assert"
import { Logger, VERBOSITY } from "../../../utils/Logger"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import type { IContentProvider } from "../../content/base/IContentProvider"
import { ContentProvider } from "../../content/ContentProvider"
import { RESPONSE } from "../../core/@consts"
import { HttpResponse } from "../../core/HttpResponse"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import {
	HttpErrorBadRequest,
	HttpErrorInternalServerError,
	HttpErrorNotImplemented,
	NormalizeError,
} from "../../errors/HttpErrors"
import type { TContext } from "../../sandbox/types/TContext"
import type {
	TSchemaRequest,
	TSchemaRequestDelete,
	TSchemaRequestInsert,
	TSchemaRequestListEntities,
	TSchemaRequestSelect,
	TSchemaRequestUpdate,
} from "../../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { ENDPOINT } from "../../webservice/@consts"
import type { TEndpoint } from "../../webservice/@types"
import type { absWebServiceProvider } from "../../webservice/base/absWebServiceProvider"
import { WebServiceProvider } from "../../webservice/WebServiceProvider"
import { DATA_PROVIDER } from "../@consts"
import type { TOptionalParameter } from "../@types"
import { absDataProvider } from "../base/absDataProvider"
import type { U__source_webservice } from "../types/U__source_webservice"


//
export class WebServiceData extends absDataProvider {
	SourceName?: string
	ProviderName = DATA_PROVIDER.WEBSERVICE
	Config: U__source_webservice | undefined
	Connection?: absWebServiceProvider

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	// WebServiceData
	ContentHandler?: IContentProvider // Content set in config file
	File = new Map<string, IContentProvider>() // Files

	@Logger.LogFunction(["sourceConfig"])
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = merge(this.Config, sourceConfig)

		//
		const { content, type: webservice } = this.Config.options

		if (content === undefined) throw new HttpErrorInternalServerError(`${this.SourceName}: Content type is not defined`)

		this.Connection = await WebServiceProvider.GetProvider(webservice)
		this.Connection.SetConfig(this.Config)

		// init webservice
		if (this.Connection) await this.Connection.Init()
		else throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize webservice provider`)

		// init content

		this.ContentHandler = await ContentProvider.GetProvider(content)
		this.ContentHandler.SetConfig(this.Config.options)
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		try {
			if (this.Connection && this.ContentHandler) {
				await this.Connection.Connect()
				Logger.Debug(`${Logger.Out} WebService provider '${this.SourceName}' connected`)
			}
		} catch (err: unknown) {
			Logger.Error(`${this.SourceName}: Failed to connect to WebService provider: ${NormalizeError(err).message}`)
		}
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		try {
			if (this.Connection && this.ContentHandler) await this.Connection.Disconnect()
		} catch (err: unknown) {
			Logger.Error(`${this.SourceName}: Failed to disconnect in WebService provider: ${NormalizeError(err).message}`)
		}
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		if (!this.Connection)
			throw new HttpErrorInternalServerError(`${this.SourceName}: Connection failed in WebService provider`)

		const { schema, entity } = schemaRequest

		this.SetContentHandler(entity)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		this.File.get(entity)?.InitContent(entity, await this.Connection.Read($context))

		const data = await this.File.get(entity)?.Get(
			<TRowsCopyParams>{
				fields: options.Fields,
				filter: options.Filter,
				sort: options.Sort,
			},
			$context,
		)

		Assert.Var<DataTable>(data, "Data is undefined")

		if (Logger.Level === VERBOSITY.DEBUG) data.MetaDataSet("__DEBUG_SOURCE_OPTIONS__", this.Config?.options)

		if (options?.Cache)
			await this.CacheSet(
				{
					...schemaRequest,
					source: this.SourceName,
				},
				data,
			)

		return HttpResponse.Ok(<TSchemaResponse>{
			schema,
			entity,
			...RESPONSE.SELECT.SUCCESS.MESSAGE,
			...RESPONSE.SELECT.SUCCESS.STATUS,
			data,
		})
	}

	@Logger.LogFunction()
	async Insert(
		schemaRequest: TSchemaRequestInsert,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		if (!schemaRequest.data) throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

		if (!this.Connection)
			throw new HttpErrorInternalServerError(`${this.SourceName}: Connection failed in WebService provider`)

		const { entity } = schemaRequest

		this.SetContentHandler(entity)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		$context = merge($context, {
			$options: options,
		})

		if (!DataTable.Is(options.Data)) throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

		return options.Data.ForEach(async (row: TJson) => {
			$context = merge($context, {
				$row: row,
			})

			return this.Connection?.Create(row, $context)
		})
			.then(() => this.CacheRemove(schemaRequest))
			.then(() => HttpResponse.Created())
	}

	@Logger.LogFunction()
	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		if (!schemaRequest.data) throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

		if (!this.Connection)
			throw new HttpErrorInternalServerError(`${this.SourceName}: Connection failed in WebService provider`)

		const { entity } = schemaRequest

		this.SetContentHandler(entity)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		$context = merge($context, {
			$options: options,
		})

		this.File.get(entity)?.InitContent(entity, await this.Connection.Read($context))

		const endpointUpdate = this.Connection.Endpoints.get(ENDPOINT.ITEM_UPDATE)

		Assert.Condition(endpointUpdate !== undefined, `${this.SourceName}: Invalid endpoint in WebService provider`)
		Assert.Var<TEndpoint>(
			this.Connection.IsEndpoint(endpointUpdate),
			`${this.SourceName}: Invalid endpoint in WebService provider`,
		)

		using keysCollection = await this.File.get(entity)?.Get(
			<TRowsCopyParams>{
				fields: options.Fields,
				filter: options.Filter,
				sort: options.Sort,
			},
			$context,
		)

		Assert.Var<DataTable>(keysCollection, "Keys collection is undefined")

		return keysCollection
			.ForEach(async (row: TJson) => {
				if (!Array.isArray(await options.Data?.Rows())) return

				const mergedRow: TJson = merge(row, await options.Data?.Row(0))

				$context = merge($context, {
					$row: row,
				})

				return this.Connection?.Update(mergedRow, $context)
			})
			.then(() => this.CacheRemove(schemaRequest))
			.then(() => HttpResponse.NoContent())
	}

	@Logger.LogFunction()
	ListEntities(_schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		throw new HttpErrorNotImplemented()
	}

	@Logger.LogFunction()
	AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
		throw new HttpErrorNotImplemented()
	}

	@Logger.LogFunction()
	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		if (!this.Connection)
			throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to read in WebService provider`)

		const { entity } = schemaRequest

		this.SetContentHandler(entity)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		$context = merge($context, {
			$options: options,
		})

		this.File.get(entity)?.InitContent(entity, await this.Connection.Read($context))

		const endpointDelete = this.Connection.Endpoints.get(ENDPOINT.ITEM_DELETE)

		Assert.Condition(endpointDelete !== undefined, `${this.SourceName}: Invalid endpoint in WebService provider`)
		Assert.Var<TEndpoint>(
			this.Connection.IsEndpoint(endpointDelete),
			`${this.SourceName}: Invalid endpoint in WebService provider`,
		)

		using keysCollection = await this.File.get(entity)?.Get(
			<TRowsCopyParams>{
				fields: options.Fields,
				filter: options.Filter,
				sort: options.Sort,
			},
			$context,
		)

		Assert.Var<DataTable>(keysCollection, "Keys collection is undefined")

		return keysCollection
			.ForEach(async (row: TJson) => {
				$context = merge($context, {
					$row: row,
				})
				this.Connection?.Delete($context)
			})
			.then(() => this.CacheRemove(schemaRequest))
			.then(() => HttpResponse.NoContent())
	}

	EscapeEntity(entity: string): string {
		return `"${entity}"`
	}

	EscapeField(field: string): string {
		return `"${field}"`
	}

	//
	// WebServiceData
	//

	SetContentHandler(entity: string) {
		if (!this.File.has(entity) && this.ContentHandler) this.File.set(entity, this.ContentHandler)
	}
}
