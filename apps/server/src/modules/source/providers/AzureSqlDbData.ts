//
//
//
import { Logger } from "@metal/logger"
import { merge } from "lodash-es"
//
import { SynchronizerManager } from "../../../utils/SynchronizerManager"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import {
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
import { DATA_PROVIDER } from "../@consts"
import type { U__source_sqlserver } from "../types/U__source_sqlserver"
import { SqlServerData } from "./SqlServerData"

//
export class AzureSqlDbData extends SqlServerData {
	ProviderName = DATA_PROVIDER.AZURE_SQLDB

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	@Logger.LogFunction()
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = merge({
			options: {
				encrypt: true, // true for azure
			},
		}, sourceConfig as U__source_sqlserver)
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		super.Connect()
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		super.Disconnect()
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		return super.Select(schemaRequest, $context)
	}

	@Logger.LogFunction()
	async Insert(
		schemaRequest: TSchemaRequestInsert,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		return super.Insert(schemaRequest, $context)
	}

	@Logger.LogFunction()
	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		return super.Update(schemaRequest, $context)
	}

	@Logger.LogFunction()
	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		return super.Delete(schemaRequest, $context)
	}

	@Logger.LogFunction()
	async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
		throw new HttpErrorNotImplemented()
	}

	@Logger.LogFunction()
	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		return super.ListEntities(schemaRequest)
	}
}
