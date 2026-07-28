//
//
//

import { Logger, VERBOSITY } from "@metal/logger"
import { has, merge } from "lodash-es"
//
import type { DataTable, TRowsCopyParams } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { Convert } from "../../../utils/Convert"
import { Mutex } from "../../../utils/Mutex"
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
	HttpErrorNotFound,
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
import { STORAGE_TYPE } from "../../storage/@consts"
import type { absStorageProvider } from "../../storage/base/absStorageProvider"
import { StorageProvider } from "../../storage/StorageProvider"
import { DATA_PROVIDER } from "../@consts"
import type { TOptionalParameter } from "../@types"
import { absDataProvider } from "../base/absDataProvider"
import type { U__source_storage } from "../types/U__source_storage"
import type { U__source_storage_files, U__source_storage_files_content } from "../types/U__source_storage_files"
import { z_U__source_storage_files_content } from "../types/U__source_storage_files"

//
export class StorageFilesData extends absDataProvider {
	SourceName?: string
	ProviderName = DATA_PROVIDER.STORAGE
	Config: U__source_storage = <U__source_storage>{}
	Connection?: absStorageProvider = undefined

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	// FilesData
	ContentHandler: Record<string, IContentProvider> = {} // Contents set in config
	File: Record<string, IContentProvider> = {} // Files
	Lock: Map<string, Mutex> = new Map<string, Mutex>() // Locker for exclusive access

	_setContentHandler(entity: string) {
		if (!has(this.File, entity)) {
			const handler = Object.keys(this.ContentHandler).find((pattern) => Convert.PatternToRegex(pattern)?.test(entity))
			if (handler) this.File[entity] = this.ContentHandler[handler]!
			else throw new HttpErrorNotImplemented(`${this.SourceName}: No content handler found for entity ${entity}`)
		}
	}

	_setLock(entity: string) {
		if (!this.Lock.has(entity)) this.Lock.set(entity, new Mutex())
	}

	@Logger.LogFunction()
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = sourceConfig as U__source_storage
		const { "storage-type": storage = STORAGE_TYPE.FILESYSTEM, content } = this.Config.options as U__source_storage_files

		Assert.Var<U__source_storage_files_content>(
			content,
			z_U__source_storage_files_content.safeParse(content).success,
			`${this.SourceName}: Content type is not defined`,
		)

		this.Connection = await StorageProvider.GetProvider(storage)
		this.Connection.SetConfig(this.Config)

		// init storage
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)
		this.Connection.Init()

		// init content
		for (const filePattern in content) {
			if (Object.hasOwn(content, filePattern)) {
				const { "content-type": type } = content[filePattern]!

				this.ContentHandler[filePattern] = await ContentProvider.GetProvider(type)
				this.ContentHandler[filePattern].SetConfig(content[filePattern]!)
			}
		}
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage Data provider (file) is not defined`)
		Assert.Condition(this.ContentHandler !== undefined, `${this.SourceName}: Storage Data provider (file) is not defined`)

		await this.Connection.Connect().then(() => {
			Logger.Debug(`${Logger.Out} Storage Data provider (file) '${this.SourceName}' connected`)
		})
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		try {
			if (this.Connection && this.ContentHandler) await this.Connection.Disconnect()
		} catch (err: unknown) {
			Logger.Error(`${this.SourceName}: Failed to disconnect in storage provider: ${NormalizeError(err).message}`)
		}
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

		const { schema: dirName, entity: fileName } = schemaRequest

		this._setContentHandler(fileName)

		this.File[fileName]?.InitContent(fileName, await this.Connection.FileRead("", fileName))

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const data = await this.File[fileName]?.Get(
			<TRowsCopyParams>{
				fields: options.Fields,
				filter: options.Filter,
				sort: options.Sort,
			},
			$context,
		)

		if (!data) throw new HttpErrorNotFound(`File not found: ${fileName}`)

		if (Logger.Level === VERBOSITY.DEBUG) data.MetaDataSet("__DEBUG_SOURCE_OPTIONS__", this.Config.options)

		if (options?.Cache)
			await this.CacheSet(
				{
					...schemaRequest,
					source: this.SourceName,
				},
				data,
			)

		return HttpResponse.Ok(<TSchemaResponse>{
			schema: dirName,
			entity: fileName,
			...RESPONSE.SELECT.SUCCESS.MESSAGE,
			...RESPONSE.SELECT.SUCCESS.STATUS,
			data,
		})
	}

	@Logger.LogFunction(true)
	async Insert(
		schemaRequest: TSchemaRequestInsert,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		Assert.Var<DataTable>(options.Data, `${this.SourceName}: Data is not defined`, new HttpErrorBadRequest())

		const { entity: fileName } = schemaRequest

		this._setContentHandler(fileName)
		this._setLock(fileName)
		await this.Lock.get(fileName)?.Acquire()

		try {
			this.File[fileName]?.InitContent(fileName, await this.Connection.FileRead("", fileName))

			using data = await this.File[fileName]?.Get({}, $context)
			if (!data) throw new HttpErrorNotFound(`File not found: ${fileName}`)

			await data.RowsAdd(await options.Data.Rows())
			const readableData = await this.File[fileName]?.Set(data, $context)
			if (!readableData) throw new HttpErrorInternalServerError(`Failed to set data for file: ${fileName}`)
			await this.Connection.FileWrite("", fileName, readableData)

			// clean cache
			await this.CacheRemove(schemaRequest)
			return HttpResponse.Created()
		} catch (err: unknown) {
			throw new HttpErrorInternalServerError(`${this.SourceName}: ${NormalizeError(err).message}`)
		} finally {
			this.Lock.get(fileName)?.Release()
		}
	}

	@Logger.LogFunction(true)
	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		Assert.Var<DataTable>(options.Data, `${this.SourceName}: Data is not defined`, new HttpErrorBadRequest())

		const { entity: fileName } = schemaRequest

		this._setContentHandler(fileName)
		this._setLock(fileName)
		await this.Lock.get(fileName)?.Acquire()

		try {
			this.File[fileName]?.InitContent(fileName, await this.Connection.FileRead("", fileName))

			using data = await this.File[fileName]?.Get({}, $context)
			if (!data) throw new HttpErrorNotFound(`File not found: ${fileName}`)

			const sqlQueryHelper = await this.GenerateSqlUpdate(schemaRequest, options)

			await data.FreeSql({ sqlQuery: sqlQueryHelper.Query(), queryParams: sqlQueryHelper.QueryParams })

			const readableData = await this.File[fileName]?.Set(data, $context)
			if (!readableData) throw new HttpErrorInternalServerError(`Failed to set data for file: ${fileName}`)
			await this.Connection.FileWrite("", fileName, readableData)

			// clean cache
			await this.CacheRemove(schemaRequest)
			return HttpResponse.NoContent()
		} catch (err: unknown) {
			throw new HttpErrorInternalServerError(
				`${this.SourceName}: Failed to update ${fileName} in storage provider: ${NormalizeError(err).message}`,
			)
		} finally {
			this.Lock.get(fileName)?.Release()
		}
	}

	@Logger.LogFunction()
	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const { entity: fileName } = schemaRequest

		this._setContentHandler(fileName)
		this._setLock(fileName)
		await this.Lock.get(fileName)?.Acquire()

		try {
			this.File[fileName]?.InitContent(fileName, await this.Connection.FileRead("", fileName))

			using data = await this.File[fileName]?.Get({}, $context)
			if (!data) throw new HttpErrorNotFound(`File not found: ${fileName}`)

			const sqlQueryHelper = this.GenerateSqlDelete(schemaRequest, options)

			await data.FreeSql({ sqlQuery: sqlQueryHelper.Query(), queryParams: sqlQueryHelper.QueryParams })

			const readableData = await this.File[fileName]?.Set(data, $context)
			if (!readableData) throw new HttpErrorInternalServerError(`Failed to set data for file: ${fileName}`)
			await this.Connection.FileWrite("", fileName, readableData)

			// clean cache
			await this.CacheRemove(schemaRequest)
			return HttpResponse.NoContent()
		} catch (err: unknown) {
			throw new HttpErrorInternalServerError(
				`${this.SourceName}: Failed to update ${fileName} in storage provider: ${NormalizeError(err).message}`,
			)
		} finally {
			this.Lock.get(fileName)?.Release()
		}
	}

	@Logger.LogFunction()
	async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
		throw new HttpErrorNotImplemented()
	}

	@Logger.LogFunction()
	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

		const { schema } = schemaRequest

		const rxFilePatterns = new RegExp(
			`(${Object.keys(this.ContentHandler)
				.map((filePattern) => Convert.PatternToRegex(filePattern).toString().replaceAll("/", ""))
				.join("|")})`,
		)

		const data = await this.Connection.FolderListFiles()
		await data.RowsSet((await data.Rows()).filter((row) => rxFilePatterns.test(row.name as string)))

		Assert.Condition((await data.Count()) > 0, `${schema}: No entities found`, new HttpErrorNotFound())

		return HttpResponse.Ok(<TSchemaResponse>{
			schema,
			...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
			...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
			data,
		})
	}

	EscapeEntity(entity: string): string {
		return `"${entity}"`
	}

	EscapeField(field: string): string {
		return `"${field}"`
	}
}
