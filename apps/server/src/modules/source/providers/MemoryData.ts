//
//
//
import { Logger } from "@metal/logger"
import { merge } from "lodash-es"
//
import { DataBase } from "../../../types/DataBase"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { RESPONSE } from "../../core/@consts"
import { HttpResponse } from "../../core/HttpResponse"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import { HttpErrorBadRequest, HttpErrorNotFound } from "../../errors/HttpErrors"
import type { TContext } from "../../sandbox/types/TContext"
import type {
	TSchemaRequestAddEntity,
	TSchemaRequestDelete,
	TSchemaRequestInsert,
	TSchemaRequestListEntities,
	TSchemaRequestSelect,
	TSchemaRequestUpdate,
} from "../../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { DATA_ENTITY_TYPE, DATA_PROVIDER } from "../@consts"
import type { TOptionalParameter } from "../@types"
import { absDataProvider } from "../base/absDataProvider"
import type { U__source_memory } from "../types/U__source_memory"


//
export class MemoryData extends absDataProvider {
	SourceName?: string
	ProviderName = DATA_PROVIDER?.MEMORY
	Config: U__source_memory = <U__source_memory>{}
	Connection?: DataBase = undefined

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	DEFAULT: Partial<U__source_memory> = {
		options: {
			autocreate: false,
		},
	}

	@Logger.LogFunction()
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = merge(this.DEFAULT, sourceConfig as U__source_memory)
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<string>(this.SourceName, "SourceName is required")
		this.Connection = new DataBase(this.Config.database ?? this.SourceName)
		Logger.Info(`${Logger.Out} Connected to '${this.SourceName}'`)
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		this.Connection = undefined
		Logger.Info(`${Logger.Out} Disconnected from '${this.SourceName}'`)
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		const { schema, entity } = schemaRequest

		Assert.Var<DataBase>(this.Connection, `${schema}: Connection is required`)

		const schemaResponse = <TSchemaResponse>{
			schema,
			entity,
		}

		if (this.Config.options?.autocreate) {
			await this.AddEntity(schemaRequest)
		}

		Assert.Var<DataTable>(
			this.Connection.Tables[entity],
			`${schema}: Entity '${entity}' not found`,
			new HttpErrorNotFound(),
		)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const data = new DataTable(entity)

		const memoryRows = await this.Connection.Tables[entity].Rows({
			fields: options.Fields,
			filter: options.Filter,
			sort: options.Sort,
		})

		if (memoryRows.length > 0) {
			await data.RowsSet(memoryRows)
			if (options?.Cache) await this.CacheSet(schemaRequest, data)
		}

		return HttpResponse.Ok(<TSchemaResponse>{
			...schemaResponse,
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
		const { schema, entity } = schemaRequest

		Assert.Var<DataBase>(this.Connection, `${schema}: Connection is required`)

		await this.AddEntity(schemaRequest)

		Assert.Var<DataTable>(
			this.Connection.Tables[entity],
			`${schema}: Entity '${entity}' not found`,
			new HttpErrorNotFound(),
		)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		Assert.Var<DataTable>(options.Data, `${schema}: data is missing`, new HttpErrorBadRequest())

		return this.Connection.Tables[entity]
			.RowsAdd(await options.Data.Rows())
			.then(() => this.CacheRemove(schemaRequest))
			.then(() => HttpResponse.Created())
	}

	@Logger.LogFunction()
	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		const { schema, entity } = schemaRequest

		Assert.Var<DataBase>(this.Connection, `${schema}: Connection is required`)
		Assert.Var<DataTable>(
			this.Connection.Tables[entity],
			`${schema}: Entity '${entity}' not found`,
			new HttpErrorNotFound(),
		)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		Assert.Var<DataTable>(options.Data, `${schema}: data is missing`, new HttpErrorBadRequest())

		const sqlQueryHelper = await this.GenerateSqlUpdate(schemaRequest, options)

		await this.Connection.Tables[entity].FreeSql({
			sqlQuery: sqlQueryHelper.Query(),
			queryParams: sqlQueryHelper.QueryParams,
		})

		// clean cache
		await this.CacheRemove(schemaRequest)

		return HttpResponse.NoContent()
	}

	@Logger.LogFunction()
	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		const { schema, entity } = schemaRequest

		Assert.Var<DataBase>(this.Connection, `${schema}: Connection is required`)
		Assert.Var<DataTable>(
			this.Connection.Tables[entity],
			`${schema}: Entity '${entity}' not found`,
			new HttpErrorNotFound(),
		)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const sqlQueryHelper = this.GenerateSqlDelete(schemaRequest, options)

		await this.Connection.Tables[entity].FreeSql({
			sqlQuery: sqlQueryHelper.Query(),
			queryParams: sqlQueryHelper.QueryParams,
		})

		// clean cache
		await this.CacheRemove(schemaRequest)

		return HttpResponse.NoContent()
	}

	@Logger.LogFunction()
	async AddEntity(schemaRequest: TSchemaRequestAddEntity): Promise<TInternalResponse<undefined>> {
		const { schema, entity } = schemaRequest
		Assert.Var<DataBase>(this.Connection, `${schema}: Connection is required`)

		if (this.Config.options?.autocreate && !Object.keys(this.Connection.Tables).includes(entity))
			this.Connection.AddTable(entity)

		return HttpResponse.Created()
	}

	@Logger.LogFunction()
	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		const { schema } = schemaRequest

		Assert.Var<DataBase>(this.Connection, `${schema}: Connection is required`)

		const rows = await Promise.all(
			Object.keys(this.Connection.Tables).map(async (entity) => ({
				name: entity,
				type: DATA_ENTITY_TYPE.DATATABLE,
				size: await this.Connection?.Tables[entity]?.Count(),
			})),
		)

		Assert.Condition(rows.length > 0, `${schema}: No entities found`, new HttpErrorNotFound())

		return HttpResponse.Ok(<TSchemaResponse>{
			schema,
			...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
			...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
			data: new DataTable(undefined, rows),
		})
	}

	EscapeEntity(entity: string): string {
		return `"${entity}"`
	}

	EscapeField(field: string): string {
		return field
	}
}
