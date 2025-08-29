//
//
//
import _ from "lodash"
import { CosmosClient, Container, Database, SqlQuerySpec, OperationInput, ConnectionMode, CosmosClientOptions } from "@azure/cosmos"
//
import { absDataProvider } from "../base/absDataProvider"
import { TConfigSource } from "../types/TConfigSource"
import { TDataListEntity } from "../types/TDataListEntity"
import { DATA_ENTITY , DATA_PROVIDER } from "../@consts"
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestUpdate, TSchemaRequestSelect, TSchemaRequestListEntities } from '../../schema/types/TSchemaRequest'
import { TInternalResponse } from '../../schema/types/TInternalResponse'
import { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { HttpErrorInternalServerError, HttpErrorBadRequest, HttpErrorNotFound, HttpErrorNotImplemented } from "../../errors/HttpErrors"
import { TOptionalParameter } from "../types/TOptionalParameter"
import { DataTable } from "../../../types/DataTable"
import { Logger } from "../../../utils/Logger"
import { TContext } from "../../sandbox/types/TContext"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import { Cache } from "../../cache/Cache"
import { HttpResponse } from "../../core/HttpResponse"
import { RESPONSE } from "../../core/@consts"
import { StringUtils } from "../../../utils/StringUtils"
import { CosmosDbHelper } from "./CosmosDbHelper"
import { Assert } from "../../../utils/Assert"
import { TStorageFile } from "../../storage/@types"


//
export type TCosmosDbDataConfig = {
    provider: DATA_PROVIDER.COSMOSDB
    host: string
    database: string
    options: CosmosClientOptions & {
        autocreate?: boolean
    }
}


//
export class CosmosDbData extends absDataProvider {
    ProviderName = DATA_PROVIDER.COSMOSDB
    SourceName?: string
    Config: TCosmosDbDataConfig = <TCosmosDbDataConfig>{}
    Connection?: Container

    DEFAULT: Partial<TCosmosDbDataConfig> = {
        host: '',
        options: {
            key: '',
            endpoint: '',
            consistencyLevel: 'Session',
            connectionPolicy: {
                requestTimeout: 5000,
                connectionMode: ConnectionMode.Gateway
            }
        }
    }

    // Cosmos DB client
    private Client?: CosmosClient
    private Database?: Database

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        await super.Init(source, sourceConfig)
        this.Config = _.merge(this.DEFAULT, sourceConfig as TCosmosDbDataConfig)
        this.Config.options.endpoint = this.Config.host

        Assert.Condition(!StringUtils.IsEmpty(this.Config.options.endpoint), `${Logger.Out} ${this.SourceName}: Cosmos DB endpoint is required`)
        Assert.Condition(!StringUtils.IsEmpty(this.Config.options.key), `${Logger.Out} ${this.SourceName}: Cosmos DB key is required`)
        Assert.Condition(!StringUtils.IsEmpty(this.Config.database), `${Logger.Out} ${this.SourceName}: Cosmos DB database is required`)
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        //TODO workaround for SSL/TLS errors
        // file deepcode ignore InsecureTLSConfig: Workround
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

        try {
            const { database, options } = this.Config

            this.Client = new CosmosClient(options)

            // Get or create database
            this.Database = this.Config.options.autocreate
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
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<Database>(this.Database, this.Database !== undefined, `${Logger.Out} ${this.SourceName}: Database not connected`)
        const { schema, entity } = schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        try {
            const container = await this.GetContainer(schemaRequest)
            const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)
            const iterator = await container.items.query(CosmosDbHelper.ParseSqlQuery(sqlQueryHelper.Query()))
            const { resources: rows } = await iterator.fetchAll()

            const data = new DataTable(entity)

            if (rows.length > 0) {
                data.AddRows(rows)
                if (options?.Cache)
                    Cache.Set(schemaRequest, data)
            }

            return HttpResponse.Ok(<TSchemaResponse>{
                schema,
                entity,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data
            })

        } catch (error) {
            throw new HttpErrorInternalServerError(`Cosmos DB query failed for entity '${entity}': ${(error as Error).message}`)
        }
    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        const { entity } = schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!DataTable.Is(options.Data) || !options.Data.Rows || options.Data.Rows.length === 0) {
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)
        }

        try {
            const container = await this.GetContainer(schemaRequest)

            // Use bulk operations for better performance
            const operations: Array<{ operationType: 'Create'; id: string; resourceBody: typeof options.Data.Rows[0] }> = options.Data.Rows.map(row => {
                // Ensure each document has an id
                if (!row.id) {
                    row.id = Date.now().toString() + Math.random().toString().substring(2, 8)
                }
                return {
                    operationType: 'Create' as const,
                    id: row.id as string,
                    resourceBody: row
                }
            })

            // Cosmos DB has a limit on bulk operations (usually 100)
            // So we need to chunk them
            const chunkSize = 100
            for (let i = 0; i < operations.length; i += chunkSize) {
                const chunk = operations.slice(i, i + chunkSize) as OperationInput[]
                // eslint-disable-next-line no-await-in-loop
                await container.items.bulk(chunk)
            }

            // clean cache
            Cache.Remove(schemaRequest)

            return HttpResponse.Created()
        } catch (error: any) {
            Logger.Error(`Failed to insert into '${entity}': ${error}`)
            throw new HttpErrorInternalServerError(`Failed to insert items: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        const { entity, schema } = schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!DataTable.Is(options.Data) || !options.Data.Rows || options.Data.Rows.length === 0) {
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
                .query(
                    <SqlQuerySpec>{
                        query,
                        options: { enableCrossPartitionQuery: true }
                    }
                )
                .fetchAll()

            if (itemsToUpdate.length === 0) {
                return HttpResponse.NoContent()
            }

            const updateData = options.Data.Rows[0]

            await Promise.all(itemsToUpdate.map(async (item) => {
                try {
                    const partitionKeyValue = item._partitionKey ?? item.partitionKey ?? this.GetPartitionKey(item, partitionKeyPath)
                    if (partitionKeyValue === undefined) {
                        throw new Error(`Missing partition key value '${partitionKeyPath}' on item ${item.id}`)
                    }

                    const updatedItem = {
                        ...item,
                        ...updateData
                    }

                    Logger.Debug(`Updating item ${item.id} in ${schema}.${entity} with partition key: ${partitionKeyValue}`)

                    const response = await container.item(item.id, partitionKeyValue).replace(updatedItem)

                    if (![200, 201].includes(response.statusCode)) {
                        throw new Error(`Failed to update item ${item.id}: ${response.statusCode}`)
                    }
                } catch (updateError: any) {
                    Logger.Error(`Failed to update item ${item.id} in ${schema}.${entity}: ${updateError}`)
                    throw updateError
                }
            }))

            Cache.Remove(schemaRequest)
            return HttpResponse.NoContent()

        } catch (error: any) {
            Logger.Error(`Failed to update in '${schema}.${entity}': ${error}`)
            throw new HttpErrorInternalServerError(`Failed to update items: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        const { entity, schema } = schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

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
                    options: { enableCrossPartitionQuery: true }
                })
                .fetchAll()

            if (itemsToDelete.length === 0) {
                return HttpResponse.NoContent()
            }

            await Promise.all(itemsToDelete.map(async (item) => {
                try {
                    const partitionKeyValue = item._partitionKey ?? item.partitionKey ?? this.GetPartitionKey(item, partitionKeyPath)
                    if (partitionKeyValue === undefined) {
                        throw new Error(`Missing partition key value '${partitionKeyPath}' on item ${item.id}`)
                    }

                    Logger.Debug(`Deleting item ${item.id} from ${schema}.${entity} with partition key: ${partitionKeyValue}`)

                    const response = await container.item(item.id, partitionKeyValue).delete()

                    if (response.statusCode !== 204) {
                        throw new Error(`Failed to delete item ${item.id}: ${response}`)
                    }
                } catch (deleteError: any) {
                    if (deleteError.code === 404) {
                        Logger.Warn(`'${schema}.${entity}': Item ${item.id} not found`)
                        return
                    }

                    Logger.Error(`Failed to delete item ${item.id} from ${schema}.${entity}: ${deleteError}`)
                    throw deleteError
                }
            }))

            Cache.Remove(schemaRequest)
            return HttpResponse.NoContent()

        } catch (error: any) {
            Logger.Error(`Failed to delete from '${schema}.${entity}': ${error}`)
            throw new HttpErrorInternalServerError(`Failed to delete items: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<Database>(this.Database, this.Database !== undefined, `${Logger.Out} ${this.SourceName}: Database not connected`)

        const { schema } = schemaRequest

        try {
            const { resources: containers } = await this.Database.containers.readAll().fetchAll()

            if (!containers || containers.length === 0) {
                throw new HttpErrorNotFound(`${schema}: No entities found`)
            }

            // Get container stats
            const rows = await Promise.all(
                containers.map(async (container) => {
                    const containerInstance = this.Database!.container(container.id)
                    let size = -1

                    try {
                        // Count documents in container
                        const querySpec = {
                            query: "SELECT VALUE COUNT(1) FROM c"
                        }
                        const { resources } = await containerInstance.items.query(querySpec).fetchAll()
                        size = resources[0]
                    } catch (error) {
                        Logger.Error(`Failed to get size for container '${container.id}': ${error}`)
                    }

                    return <TDataListEntity>{
                        name: container.id,
                        type: DATA_ENTITY.CONTAINER,
                        size,
                        meta: {
                            partitionKey: container.partitionKey
                        }
                    }
                })
            )

            return HttpResponse.Ok(<TSchemaResponse>{
                schema,
                ...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
                ...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
                data: new DataTable(schema, rows)
            })

        } catch (error: any) {
            if (error instanceof HttpErrorNotFound) {
                throw error
            }
            Logger.Error(`Failed to list entities: ${error}`)
            throw new HttpErrorInternalServerError(`Failed to list entities: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return CosmosDbHelper.EscapeEntity(entity)
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return CosmosDbHelper.EscapeField(field)
    }

    async GetContainer(schemaRequest: TSchemaRequest): Promise<Container> {
        Assert.Var<Database>(this.Database, this.Database !== undefined, `${Logger.Out} ${this.SourceName}: Database not connected`)

        try {
            const { Body } = await this.ListEntities(schemaRequest)
            const containerDetails: TDataListEntity = Body?.data.FilterRows(`name = "${schemaRequest.entity}"`).Rows[0] as TStorageFile

            const { container } = await this.Database.containers.createIfNotExists({
                id: containerDetails.name,
                partitionKey: containerDetails.meta?.partitionKey
            })

            return container
        } catch (error) {
            Logger.Error(`Failed to get or create container '${schemaRequest.entity}': ${error}`)
            throw new HttpErrorInternalServerError(`Failed to get or create container: ${error}`)
        }
    }

    GetPartitionKey(item: any, path?: string): any {
        if (!path) return undefined
        const key = path.replace(/^\//, '')
        return item[key]
    }
}
