//
//
//
import {
	type Container,
	CosmosClient,
	type CosmosClientOptions,
	type Database,
	type OperationInput,
	type SqlQuerySpec
} from "@azure/cosmos"
import { Logger } from "@metal/logger"
import { StringUtils } from "@metal/utils"
import { merge } from "lodash-es"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { SqlQueryUtils } from "../../../utils/SqlQueryUtils"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { RESPONSE } from "../../core/@consts"
import { HttpResponse } from "../../core/HttpResponse"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import {
	HttpErrorBadRequest,
	HttpErrorInternalServerError,
	HttpErrorNotFound,
	HttpErrorNotImplemented
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
import { DATA_ENTITY_TYPE, DATA_PROVIDER } from "../@consts"
import type { TDataListEntity, TOptionalParameter } from "../@types"
import { absDataProvider } from "../base/absDataProvider"
import type { U__source_cosmosdb } from "../types/U__source_cosmosdb"
import { CosmosDbHelper } from "./CosmosDbHelper"

//
export class CosmosDbData extends absDataProvider {
	ProviderName = DATA_PROVIDER.COSMOSDB
	SourceName?: string
	Config: U__source_cosmosdb = <U__source_cosmosdb>{}
	Connection?: Container

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	DEFAULT: Partial<U__source_cosmosdb> = {
		host: "",
		options: {
			key: "",
			endpoint: "",
			consistencyLevel: "Session",
			connectionPolicy: {
				requestTimeout: 5000,
			},
		},
	}

	#getPartitionKey(item: any, path?: string): any {
		if (!path) return undefined
		const key = path.replaceAll(/^\//, "")
		return item[key]
	}

	// Cosmos DB client
	private Client?: CosmosClient
	private Database?: Database

	@Logger.LogFunction()
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = merge(this.DEFAULT, sourceConfig) as U__source_cosmosdb
		// Config is initialized in Init(); assert non-null here for TS
		this.Config!.options!.endpoint = this.Config!.host

		Assert.Condition(
			!StringUtils.IsEmpty(this.Config.options!.endpoint),
			`${this.SourceName}: Cosmos DB endpoint is required`,
		)
		Assert.Condition(!StringUtils.IsEmpty(this.Config.options!.key), `${this.SourceName}: Cosmos DB key is required`)
		Assert.Condition(!StringUtils.IsEmpty(this.Config.database), `${this.SourceName}: Cosmos DB database is required`)
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		//TODO workaround for SSL/TLS errors
		// file deepcode ignore InsecureTLSConfig: Workround
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

		try {
			const { database, options } = this.Config

			this.Client = new CosmosClient(options as CosmosClientOptions)

			// Get or create database
			this.Database = this.Config.options!.autocreate
				? (await this.Client.databases.createIfNotExists({ id: database })).database
				: this.Client.database(database)

			Logger.Info(`${Logger.Out} connected to database '${database}'`)
		} catch (error: unknown) {
			Logger.Error(`Failed to connect to '${this.SourceName}': ${error}`)
			throw new HttpErrorInternalServerError(`Failed to connect to Cosmos DB: ${error}`)
		}
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		this.Database = undefined
		this.Connection = undefined
		// The official SDK doesn't have a disconnect method, but it does have dispose
		if (this.Client) {
			this.Client.dispose()
			this.Client = undefined
		}
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		const { schema, entity } = schemaRequest

		Assert.Var<Database>(this.Database, this.Database !== undefined, `${schema}: Database not connected`)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		try {
			const container = await this.GetContainer(schemaRequest)
			const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)
			const iterator = container.items.query(CosmosDbHelper.ParseSqlQuery(sqlQueryHelper.Query()))
			const { resources: rows } = await iterator.fetchAll()

			const data = new DataTable(entity)

			if (rows.length > 0) {
				await data.RowsSet(rows)
				if (options?.Cache) await this.CacheSet(schemaRequest, data)
			}

			let total = 0
			if (options?.Limit !== undefined) {
				const countQuery = this.GenerateCosmosCountQuery(schemaRequest, options)
				const { resources: countRows } = await container.items.query(countQuery).fetchAll()
				total = Number(countRows[0] ?? 0)
			}

			await this.SetPagination(data, options, total)

			return HttpResponse.Ok(<TSchemaResponse>{
				schema,
				entity,
				...RESPONSE.SELECT.SUCCESS.MESSAGE,
				...RESPONSE.SELECT.SUCCESS.STATUS,
				data,
			})
		} catch (error) {
			throw new HttpErrorInternalServerError(`Cosmos DB query failed for entity '${entity}': ${(error as Error).message}`)
		}
	}

	@Logger.LogFunction()
	async Insert(
		schemaRequest: TSchemaRequestInsert,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		const { entity } = schemaRequest

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		if (!DataTable.Is(options.Data) || !(await options.Data.Rows()) || (await options.Data.Count()) === 0) {
			throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)
		}

		try {
			const container = await this.GetContainer(schemaRequest)

			// Use bulk operations for better performance
			const operations: any[] = await options.Data.ForEach((row) => {
				// Ensure each document has an id
				if (!row.id) {
					row.id = Date.now().toString() + Math.random().toString().substring(2, 8)
				}
				return {
					operationType: "Create" as const,
					id: row.id as string,
					resourceBody: row,
				}
			})

			// Cosmos DB has a limit on bulk operations (usually 100)
			// So we need to chunk them
			const chunkSize = 100
			for (let i = 0; i < operations.length; i += chunkSize) {
				const chunk = operations.slice(i, i + chunkSize) as OperationInput[]

				await container.items.bulk(chunk)
			}

			// clean cache
			await this.CacheRemove(schemaRequest)

			return HttpResponse.Created()
		} catch (e: unknown) {
			throw new HttpErrorInternalServerError(`Failed to insert items: ${(e as Error).message}`)
		}
	}

	@Logger.LogFunction()
	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		const { entity, schema } = schemaRequest

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		if (!DataTable.Is(options.Data) || !(await options.Data.Rows()) || (await options.Data.Count()) === 0) {
			throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)
		}

		try {
			const container = await this.GetContainer(schemaRequest)
			const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

			// Fetch the actual partition key path (e.g. "/userId")
			const containerDef = await container.read()
			const partitionKeyPath = containerDef.resource?.partitionKey?.paths[0] // e.g., "/userId"

			const query = CosmosDbHelper.ParseSqlQuery(sqlQueryHelper.Query())

			const { resources: itemsToUpdate } = await container.items
				.query(<SqlQuerySpec>{
					query,
					options: { enableCrossPartitionQuery: true },
				})
				.fetchAll()

			if (itemsToUpdate.length === 0) {
				return HttpResponse.NoContent()
			}

			const updateData = (await options.Data.Rows())[0]

			await Promise.all(
				itemsToUpdate.map(async (item) => {
					try {
						const partitionKeyValue = item._partitionKey ?? item.partitionKey ?? this.#getPartitionKey(item, partitionKeyPath)

						Assert.Var<any>(partitionKeyValue, `Missing partition key value '${partitionKeyPath}' on item ${item.id}`)

						const updatedItem = {
							...item,
							...updateData,
						}

						Logger.Debug(`Updating item ${item.id} in ${schema}.${entity} with partition key: ${partitionKeyValue}`)

						const response = await container.item(item.id, partitionKeyValue).replace(updatedItem)

						Assert.Condition(
							[200, 201].includes(response.statusCode),
							`Failed to update item ${item.id}: ${response.statusCode}`,
						)
					} catch (updateError: any) {
						Logger.Error(`Failed to update item ${item.id} in ${schema}.${entity}: ${updateError}`)
						throw updateError
					}
				}),
			)

			await this.CacheRemove(schemaRequest)
			return HttpResponse.NoContent()
		} catch (e: unknown) {
			throw new HttpErrorInternalServerError(`Failed to update items: ${(e as Error).message}`)
		}
	}

	@Logger.LogFunction()
	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		const { entity, schema } = schemaRequest

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		try {
			const container = await this.GetContainer(schemaRequest)
			const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

			// Fetch the actual partition key path (e.g. "/userId")
			const containerDef = await container.read()
			const partitionKeyPath = containerDef.resource?.partitionKey?.paths[0] // e.g., "/userId"

			const query = CosmosDbHelper.ParseSqlQuery(sqlQueryHelper.Query())

			const { resources: itemsToDelete } = await container.items
				.query(<SqlQuerySpec>{
					query,
					options: { enableCrossPartitionQuery: true },
				})
				.fetchAll()

			if (itemsToDelete.length === 0) {
				return HttpResponse.NoContent()
			}

			await Promise.all(
				itemsToDelete.map(async (item) => {
					try {
						const partitionKeyValue = item._partitionKey ?? item.partitionKey ?? this.#getPartitionKey(item, partitionKeyPath)

						Assert.Var<any>(partitionKeyValue, `Missing partition key value '${partitionKeyPath}' on item ${item.id}`)

						Logger.Debug(`Deleting item ${item.id} from ${schema}.${entity} with partition key: ${partitionKeyValue}`)

						const response = await container.item(item.id, partitionKeyValue).delete()

						Assert.Condition(response.statusCode === 204, `Failed to delete item ${item.id}: ${response}`)
					} catch (e: unknown) {
						if ((e as { code?: number })?.code === 404) {
							Logger.Warn(`'${schema}.${entity}': Item ${item.id} not found`)
							return
						}

						Logger.Error(`Failed to delete item ${item.id} from ${schema}.${entity}: ${e}`)
						throw e
					}
				}),
			)

			await this.CacheRemove(schemaRequest)
			return HttpResponse.NoContent()
		} catch (e: unknown) {
			throw new HttpErrorInternalServerError(`Failed to delete items: ${(e as Error).message}`)
		}
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		const { schema } = schemaRequest

		Assert.Var<Database>(this.Database, this.Database !== undefined, `${schema}: Database not connected`)

		try {
			const { resources: containers } = await this.Database.containers.readAll().fetchAll()

			if (!containers || containers.length === 0) {
				throw new HttpErrorNotFound(`${schema}: No entities found`)
			}

			// Get container stats
			const rows = await Promise.all(
				containers.map(async (container) => {
					const containerInstance = this.Database?.container(container.id)
					let size = -1

					try {
						// Count documents in container
						const querySpec = {
							query: "SELECT VALUE COUNT(1) FROM c",
						}
						if (!containerInstance) throw new HttpErrorNotFound(`Container not found: ${container.id}`)
						const { resources } = await containerInstance.items.query(querySpec).fetchAll()
						size = resources[0]
					} catch (error) {
						Logger.Error(`Failed to get size for container '${container.id}': ${error}`)
					}

					return <TDataListEntity>{
						name: container.id,
						type: DATA_ENTITY_TYPE.CONTAINER,
						size,
						meta: {
							partitionKey: container.partitionKey,
						},
					}
				}),
			)

			return HttpResponse.Ok(<TSchemaResponse>{
				schema,
				...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
				...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
				data: new DataTable(schema, rows),
			})
		} catch (e: unknown) {
			if (e instanceof HttpErrorNotFound) 
				throw e

			throw new HttpErrorInternalServerError(`Failed to list entities: ${(e as Error).message}`)
		}
	}

	@Logger.LogFunction()
	async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
		throw new HttpErrorNotImplemented()
	}

	override GenerateSqlSelect(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryUtils {
		const sqlQueryHelper = new SqlQueryUtils(undefined, this.EscapeEntity, this.EscapeField)
			.Select(options.Fields)
			.From((schemaRequest as TSchemaRequestSelect).entity)
			.Where(options.Filter)
			.OrderBy(options.Sort)

		// Cosmos requires OFFSET before LIMIT (base emits LIMIT n OFFSET m)
		if (options.Offset) sqlQueryHelper.SetQuery(`${sqlQueryHelper.Query()} OFFSET ${options.Offset}`)
		if (options.Limit) sqlQueryHelper.SetQuery(`${sqlQueryHelper.Query()} LIMIT ${options.Limit}`)

		return sqlQueryHelper
	}

	GenerateCosmosCountQuery(schemaRequest: TSchemaRequest, options: TOptionalParameter): string {
		// Cosmos doesn't support COUNT(*) — use SELECT VALUE COUNT(1)
		return this.GenerateSqlCount(schemaRequest, options)
			.Query()
			.replace(/^SELECT\s+COUNT\(\*\)\s+AS\s+count\s+FROM/, "SELECT VALUE COUNT(1) FROM")
	}

	EscapeEntity(entity: string): string {
		return CosmosDbHelper.EscapeEntity(entity)
	}

	EscapeField(field: string): string {
		return CosmosDbHelper.EscapeField(field)
	}

	async GetContainer(schemaRequest: TSchemaRequest): Promise<Container> {
		const { schema } = schemaRequest

		Assert.Var<Database>(this.Database, this.Database !== undefined, `${schema}: Database not connected`)

		try {
			const { Body } = await this.ListEntities(schemaRequest)

			Assert.Var<DataTable>(Body?.data, `${schema}: No data found`)
			using data = Body.data

			const containerDetails = (
				await data.Rows({
					filter: `name = "${(schemaRequest as TSchemaRequestSelect).entity}"`,
				})
			)[0]

			Assert.Var<TDataListEntity>(containerDetails, `${schema}: Container not found`)

			const { container } = await this.Database.containers.createIfNotExists({
				id: containerDetails.name,
				partitionKey: containerDetails.meta?.partitionKey,
			})

			return container
		} catch (error) {
			Logger.Error(`Failed to get or create container '${(schemaRequest as TSchemaRequestSelect).entity}': ${error}`)
			throw new HttpErrorInternalServerError(`Failed to get or create container: ${error}`)
		}
	}
}
