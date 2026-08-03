//
//
//
import { Logger } from "@metal/logger"
import { JsonUtils } from "@metal/utils"
import { merge } from "lodash-es"
import mssql, { type ConnectionPool } from "mssql"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
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
import type { TOptionalParameter } from "../@types"
import { absDataProvider } from "../base/absDataProvider"
import type { U__source_sqlserver } from "../types/U__source_sqlserver"

//
export class SqlServerData extends absDataProvider {
	SourceName?: string
	ProviderName = DATA_PROVIDER.MSSQL
	Config: U__source_sqlserver = <U__source_sqlserver>{}
	Connection?: ConnectionPool = undefined

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	DEFAULT: Partial<U__source_sqlserver> = {
		host: "127.0.0.1",
		database: "master",
		user: "sa",
		password: "",
		port: 1433,
		options: {
			encrypt: false, // true for azure
			trustServerCertificate: true, // change to true for local dev / self-signed certs
			// pool: {
			//     max: 10,
			//     min: 0,
			//     idleTimeoutMillis: 30_000
			// }
		},
	}

	@Logger.LogFunction()
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = merge(this.DEFAULT, sourceConfig as U__source_sqlserver)
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		const { host: server, port, user, password, database, options } = this.Config
		try {
			this.Connection = await mssql.connect({
				server,
				port,
				user,
				password,
				database,
				options,
			})
			Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Config.database})'`)
		} catch (error: unknown) {
			Logger.Error(`${Logger.Out} Failed to connect to '${this.SourceName} (${this.Config.database})'`)
			Logger.Error(JSON.stringify(error))
		}
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		if (this.Connection === undefined) return

		await this.Connection.close()
		this.Connection = undefined
		Logger.Info(`${Logger.Out} disconnected from '${this.SourceName} (${this.Config.database})'`)
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		if (!this.Connection) throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

		const { schema, entity } = schemaRequest

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

		const sqlServerResult = await this.Connection.query(sqlQueryHelper.Query())

		const data = new DataTable(schemaRequest.entity)

		if (sqlServerResult.recordset != null && sqlServerResult.recordset.length > 0) {
			await data.RowsSet(sqlServerResult.recordset)
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
		if (!this.Connection) throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		if (!DataTable.Is(options.Data)) throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

		const sqlQueryHelper = await this.GenerateSqlInsert(schemaRequest, options)

		await this.Connection.query(sqlQueryHelper.Query())

		// clean cache
		await this.CacheRemove(schemaRequest)

		return HttpResponse.Created()
	}

	@Logger.LogFunction()
	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		if (!this.Connection) throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		if (!DataTable.Is(options.Data)) throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

		const sqlQueryHelper = await this.GenerateSqlUpdate(schemaRequest, options)

		await this.Connection.query(sqlQueryHelper.Query())

		// clean cache
		await this.CacheRemove(schemaRequest)

		return HttpResponse.NoContent()
	}

	@Logger.LogFunction()
	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		if (!this.Connection) throw new HttpErrorInternalServerError(JsonUtils.Stringify(schemaRequest))

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const sqlQueryHelper = this.GenerateSqlDelete(schemaRequest, options)

		await this.Connection.query(sqlQueryHelper.Query())

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
		Assert.Var<ConnectionPool>(
			this.Connection,
			this.Connection !== undefined,
			`${this.SourceName}: Connection is not initialized`,
		)

		const { schema, source } = schemaRequest

		const sqlQuery = `
            SELECT t.name AS name, 
                'table' AS type, 
                SUM(p.rows) AS [size]
            FROM sys.tables t
            JOIN sys.partitions p ON t.object_id = p.object_id
            WHERE p.index_id IN (0, 1) -- 0 for heap tables, 1 for clustered indexes
            GROUP BY t.name
            ORDER BY t.name;
            `

		const sqlServerResult = await this.Connection.query(sqlQuery)

		if (sqlServerResult?.recordset.length === 0) throw new HttpErrorNotFound(`${schema}: No entities found`)

		return HttpResponse.Ok(<TSchemaResponse>{
			schema,
			...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
			...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
			data: new DataTable(source, sqlServerResult.recordset),
		})
	}

	EscapeEntity(entity: string): string {
		return `[${entity}]`.replaceAll(".", "].[")
	}

	EscapeField(field: string): string {
		return `[${field}]`
	}
}
