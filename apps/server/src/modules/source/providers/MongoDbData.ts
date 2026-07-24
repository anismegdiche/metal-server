//
//
//

import { Logger } from "@metal/logger"
import { assign, merge, pick } from "lodash-es"
import type { MongoClientOptions, Document as MongoDocument } from "mongodb"
//
import { DataTable, type TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { RESPONSE } from "../../core/@consts"
import { HttpResponse } from "../../core/HttpResponse"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import {
	HttpErrorBadRequest,
	HttpErrorInternalServerError,
	HttpErrorNotFound,
	HttpErrorNotImplemented,
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
import { DATA_PROVIDER } from "../@consts"
import type { TDataListEntity, TOptionalParameter } from "../@types"
import { absDataProvider } from "../base/absDataProvider"
import { MongoDbHelper } from "./MongoDbHelper"

// Define the MongoDB types that we'll use
type MongoDbTypes = {
	MongoClient: typeof import("mongodb").MongoClient
	Filter: <_T = any>(filter: object) => object
	UpdateFilter: <_T = any>(update: object) => object
}

type Document = MongoDocument
type Filter<_T> = object
type UpdateFilter<_T> = object

//
export type U__source_mongodb = {
	provider: DATA_PROVIDER.MONGODB
	host: string
	database?: string
	options?: MongoClientOptions
}

//
export class MongoDbData extends absDataProvider {
	private static _mongoDb: MongoDbTypes | null = null

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	private static async _loadMongoDb(): Promise<MongoDbTypes> {
		if (!MongoDbData._mongoDb) {
			const mongo = await import("mongodb")
			MongoDbData._mongoDb = {
				MongoClient: mongo.MongoClient,
				Filter: (filter: object) => filter,
				UpdateFilter: (update: object) => update,
			}
		}
		return MongoDbData._mongoDb
	}

	SourceName?: string
	ProviderName = DATA_PROVIDER.MONGODB
	Config: U__source_mongodb = <U__source_mongodb>{}
	Connection?: import("mongodb").MongoClient = undefined

	DEFAULT: Partial<U__source_mongodb> = {
		host: "mongodb://127.0.0.1:27017/",
	}

	@Logger.LogFunction()
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = merge(this.DEFAULT, sourceConfig as U__source_mongodb)
		// Just load the module to ensure it's available
		await MongoDbData._loadMongoDb()
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		const MongoDb = await MongoDbData._loadMongoDb()
		this.Connection = new MongoDb.MongoClient(this.Config.host, this.Config.options)
		try {
			await this.Connection.connect()
			await this.Connection.db(this.Config.database).command({
				ping: 1,
			})
			Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Config.database})'`)
		} catch (error: unknown) {
			Logger.Error(`${Logger.Out} Failed to connect to '${this.SourceName}/${this.Config.database}'`)
			Logger.Error(error)
		}
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		if (this.Connection !== undefined) {
			await this.Connection.close()
		}
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		if (this.Connection === undefined) {
			await this.Connect()
			if (this.Connection === undefined) {
				throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))
			}
		}

		const { schema, entity } = schemaRequest

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

		const mongoParsedQuery = MongoDbHelper.ParseSqlQuery(sqlQueryHelper.Query())

		const rows = await this.Connection.db(this.Config.database)
			.collection(entity)
			.aggregate(mongoParsedQuery.aggregate)
			.toArray()

		const data = new DataTable(entity)

		if (rows.length > 0) {
			await data.RowsSet(rows)
			if (options?.Cache) await this.CacheSet(schemaRequest, data)
		}

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
		if (this.Connection === undefined) throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		if (!DataTable.Is(options.Data)) throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

		await this.Connection.db(this.Config.database)
			.collection(schemaRequest.entity)
			.insertMany(await options?.Data?.Rows())

		// clean cache
		await this.CacheRemove(schemaRequest)

		return HttpResponse.Created()
	}

	@Logger.LogFunction()
	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		if (this.Connection === undefined) throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		if (!DataTable.Is(options.Data) || (await options.Data.Count()) === 0)
			throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

		const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

		const mongoParsedQuery = MongoDbHelper.ParseSqlQuery(sqlQueryHelper.Query())

		const mongoFilter: Filter<Document> = mongoParsedQuery?.aggregate?.at(0)?.$match ?? {}

		let $set: TRow | undefined

		if ((await options?.Data?.Count()) > 0) $set = await options?.Data?.Rows({ limit: 1 })

		const mongoUpdate: UpdateFilter<Document> = {
			$set,
		}

		await this.Connection.db(this.Config.database).collection(schemaRequest.entity).updateMany(mongoFilter, mongoUpdate)

		// clean cache
		await this.CacheRemove(schemaRequest)

		return HttpResponse.NoContent()
	}

	@Logger.LogFunction()
	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		if (this.Connection === undefined) throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

		const mongoParsedQuery = MongoDbHelper.ParseSqlQuery(sqlQueryHelper.Query())

		const mongoFilter: Filter<Document> = mongoParsedQuery?.aggregate?.at(0)?.$match ?? {}

		await this.Connection.db(this.Config.database).collection(schemaRequest.entity).deleteMany(mongoFilter)

		// clean cache
		await this.CacheRemove(schemaRequest)

		return HttpResponse.NoContent()
	}

	@Logger.LogFunction()
	async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
		throw new HttpErrorNotImplemented()
	}

	@Logger.LogFunction()
	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		Assert.Var<MongoDbData>(
			this.Connection,
			this.Connection !== undefined,
			`${this.SourceName}: Connection not initialized`,
		)

		const { schema } = schemaRequest

		const collections = await this.Connection.db(this.Config.database).listCollections().toArray()

		if (collections.length === 0) throw new HttpErrorNotFound(`${schema}: No entities found`)

		const rows = await Promise.all(
			collections.map(async (item) => {
				let size = -1
				if (this.Connection !== undefined) {
					const collection = this.Connection.db(this.Config.database).collection(item.name)
					size = await collection.countDocuments()
				}

				return assign(pick(item, ["name", "type"]), { size }) as TDataListEntity
			}),
		)

		return HttpResponse.Ok(<TSchemaResponse>{
			schema,
			...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
			...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
			data: new DataTable(schema, rows),
		})
	}

	EscapeEntity(entity: string): string {
		return entity
	}

	EscapeField(field: string): string {
		return field
	}
}
