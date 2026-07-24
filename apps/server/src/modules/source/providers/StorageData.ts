//
//
//

import { Logger } from "@metal/logger"
import { merge } from "lodash-es"
//
import { Assert } from "../../../utils/Assert"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
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
import { absDataProvider } from "../base/absDataProvider"
import type { IDataProvider } from "../base/IDataProvider"
import type { U__source_storage_file_options } from "../types/U__source_storage_file_options"
import { StorageFilesData } from "./StorageFilesData"
import type { U__source_storage_folder_options } from "./StorageFoldersData"
import { StorageFoldersData } from "./StorageFoldersData"

//
export enum STORAGE_MODE {
	FILES = "files",
	FOLDERS = "folders",
}

//
export type U__source_storage_options =
	| ({
			"storage-mode": STORAGE_MODE.FILES
	  } & U__source_storage_file_options)
	| ({
			"storage-mode": STORAGE_MODE.FOLDERS
	  } & U__source_storage_folder_options)

export type U__source_storage = U__sources_source & {
	options: U__source_storage_options
}

//
export class StorageData extends absDataProvider implements IDataProvider {
	SourceName?: string
	ProviderName = DATA_PROVIDER.STORAGE
	Config: U__sources_source = <U__sources_source>{}
	Connection?: StorageFilesData | StorageFoldersData

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	DEFAULT = {
		options: {
			"storage-mode": STORAGE_MODE.FILES,
		},
	}

	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)

		this.Config = merge(this.DEFAULT, sourceConfig)

		const { "storage-mode": storageMode } = this.Config.options as U__source_storage_options

		this.Connection = storageMode === STORAGE_MODE.FILES ? new StorageFilesData() : new StorageFoldersData()

		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Connection is not defined`)

		await this.Connection.Init(source, sourceConfig)
	}

	async Connect(): Promise<void> {
		Assert.Var<StorageFilesData | StorageFoldersData>(
			this.Connection,
			`${this.SourceName}: Storage Data provider is not defined`,
		)
		await this.Connection.Connect()
	}

	async Disconnect(): Promise<void> {
		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
		await this.Connection.Disconnect()
		this.Connection = undefined
	}

	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
		return this.Connection.Select(schemaRequest, $context)
	}

	async Insert(
		schemaRequest: TSchemaRequestInsert,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
		return this.Connection.Insert(schemaRequest, $context)
	}

	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
		return this.Connection.Update(schemaRequest, $context)
	}

	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
		return this.Connection.Delete(schemaRequest, $context)
	}

	async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
		return this.Connection.AddEntity(schemaRequest)
	}

	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
		return this.Connection.ListEntities(schemaRequest)
	}

	EscapeEntity(entity: string): string {
		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
		return this.Connection.EscapeEntity(entity)
	}

	EscapeField(field: string): string {
		Assert.Var<StorageFilesData | StorageFoldersData>(this.Connection, `${this.SourceName}: Provider is not defined`)
		return this.Connection.EscapeField(field)
	}
}
