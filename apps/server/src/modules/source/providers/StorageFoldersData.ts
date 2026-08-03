//
//
//
// lodash

import { Readable } from "node:stream"
import { Logger, VERBOSITY } from "@metal/logger"
import { StringUtils } from "@metal/utils"
import { merge, omit } from "lodash-es"
//
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { Mutex } from "../../../utils/Mutex"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { RESPONSE } from "../../core/@consts"
import { HttpResponse } from "../../core/HttpResponse"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import {
	HttpErrorBadRequest,
	HttpErrorForbidden,
	HttpErrorInternalServerError,
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
import type { STORAGE_TYPE } from "../../storage/@consts"
import type { absStorageProvider } from "../../storage/base/absStorageProvider"
import { StorageProvider } from "../../storage/StorageProvider"
import type { TStorageFile } from "../../storage/types/TStorageFile"
import { DATA_PROVIDER } from "../@consts"
import type { TOptionalParameter } from "../@types"
import { absDataProvider } from "../base/absDataProvider"
import { type U__source_storage, z_U__source_storage } from "../types/U__source_storage"
import type { U__source_storage_folders } from "../types/U__source_storage_folders"

//
const FLD_CONTENT = "content"
const FLD_NAME = "name"
const FLD_OLD_NAME = "old_name"

//
export class StorageFoldersData extends absDataProvider {
	SourceName?: string
	ProviderName = DATA_PROVIDER.STORAGE
	Config: U__source_storage = <U__source_storage>{}
	Connection?: absStorageProvider

	// biome-ignore lint/complexity/noUselessConstructor: compatibility
	constructor() {
		super()
	}

	// FolderData
	Lock: Map<string, Mutex> = new Map<string, Mutex>()
	LockTimestamps: Map<string, number> = new Map<string, number>()
	LockCleanupInterval = 300000 // 5 minutes
	LockCleanupTimer?: NodeJS.Timeout

	_setLock(fileName: string) {
		if (!this.Lock.has(fileName)) this.Lock.set(fileName, new Mutex())
		this.LockTimestamps.set(fileName, Date.now())
	}

	_cleanupLock(fileName: string) {
		// Remove lock if it hasn't been used in the last cleanup interval
		const lastUsed = this.LockTimestamps.get(fileName)
		if (lastUsed && Date.now() - lastUsed > this.LockCleanupInterval) {
			this.Lock.delete(fileName)
			this.LockTimestamps.delete(fileName)
		}
	}

	async _cleanupAllLocks() {
		const now = Date.now()
		const toDelete: string[] = []
		for (const [fileName, lastUsed] of this.LockTimestamps.entries()) {
			if (now - lastUsed > this.LockCleanupInterval) {
				toDelete.push(fileName)
			}
		}
		toDelete.forEach((fileName) => {
			this.Lock.delete(fileName)
			this.LockTimestamps.delete(fileName)
		})
		if (toDelete.length > 0) {
			Logger.Debug(`${this.SourceName}: Cleaned up ${toDelete.length} unused locks`)
		}
	}

	_startLockCleanup() {
		// Run cleanup every 5 minutes
		this.LockCleanupTimer = setInterval(() => {
			this._cleanupAllLocks()
		}, this.LockCleanupInterval)
		Logger.Debug(`${this.SourceName}: Lock cleanup timer started (interval: ${this.LockCleanupInterval}ms)`)
	}

	_stopLockCleanup() {
		if (this.LockCleanupTimer) {
			clearInterval(this.LockCleanupTimer)
			this.LockCleanupTimer = undefined
			Logger.Debug(`${this.SourceName}: Lock cleanup timer stopped`)
		}
	}

	_addNameToFields(fields: string[] | undefined): string[] | undefined {
		if (fields && !fields?.includes(FLD_NAME)) fields?.push(FLD_NAME)

		return fields
	}

	@Logger.LogFunction(true)
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		await super.Init(source, sourceConfig)
		this.Config = z_U__source_storage.parse(sourceConfig) as U__source_storage

		const { "storage-type": storage } = this.Config.options

		this.Connection = await StorageProvider.GetProvider(storage as STORAGE_TYPE)
		this.Connection.SetConfig(this.Config)

		// init storage
		if (this.Connection) this.Connection.Init()
		else throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize storage provider`)

		// Start periodic lock cleanup
		this._startLockCleanup()
	}

	@Logger.LogFunction(true)
	async Connect(): Promise<void> {
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage Data provider (folder) is not defined`)

		await this.Connection.Connect().then(() => {
			Logger.Debug(`${Logger.Out} Storage Data provider (folder) '${this.SourceName}' connected`)
		})
	}

	@Logger.LogFunction(true)
	async Disconnect(): Promise<void> {
		// Stop lock cleanup timer
		this._stopLockCleanup()

		// Clean up all locks before disconnecting
		await this._cleanupAllLocks()

		if (this.Connection) await this.Connection.Disconnect()
	}

	@Logger.LogFunction(true)
	async Select(
		schemaRequest: TSchemaRequestSelect,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<TSchemaResponse>> {
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage connection not set`)
		Assert.Var<string>(schemaRequest.entity, `${this.SourceName}: Folder name is required`)

		const { schema, entity: dirName } = schemaRequest

		const schemaResponse = <TSchemaResponse>{
			schema,
			entity: dirName,
		}

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const _fieldsHasName = (options.Fields?.includes(FLD_NAME) || options.Fields?.includes("*")) ?? false

		options.Fields = this._addNameToFields(options.Fields)

		const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

		const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

		const data = await this.Connection.FolderListFiles(dirName)

		const filteredData = await data.FreeSql({ sqlQuery, returnData: true })

		if (options.Fields?.includes(FLD_CONTENT)) {
			// read files content
			await filteredData.RowsMap(async (row: TRow) => {
				let _file = row as TStorageFile
				const _fileContent = await this.Connection?.FileRead(dirName, _file.name)

				if (!_fieldsHasName) _file = omit(_file, FLD_NAME) as TStorageFile

				return ReadableUtils.ToBase64(_fileContent).then((_content) => {
					_file.content = _content
					return _file
				})
			})
		}

		if (Logger.Level === VERBOSITY.DEBUG) filteredData.MetaDataSet("__DEBUG_SOURCE_OPTIONS__", this.Config.options)

		if (options?.Cache)
			await this.CacheSet(
				{
					...schemaRequest,
					source: this.SourceName,
				},
				filteredData,
			)

		return HttpResponse.Ok(<TSchemaResponse>{
			...schemaResponse,
			...RESPONSE.SELECT.SUCCESS.MESSAGE,
			...RESPONSE.SELECT.SUCCESS.STATUS,
			data: filteredData,
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

		const dirName = schemaRequest.entity

		if (this.Config.options.autocreate && !(await this.Connection.FolderIsExist(dirName)))
			await this.Connection.FolderCreate(dirName)

		return options.Data.ForEach(async (row: TRow) => {
			const __file = row as TStorageFile

			Assert.Var<string>(__file.name, "File name is required", new HttpErrorBadRequest())
			Assert.Var<string>(__file.content, "File content is required", new HttpErrorBadRequest())
			Assert.Condition(
				StringUtils.IsBase64(__file.content),
				"File content is not a valid base64 string",
				new HttpErrorBadRequest(),
			)

			this._setLock(__file.path)
			await this.Lock.get(__file.path)?.Acquire()
			try {
				await this.Connection?.FileWrite(dirName, __file.name, Readable.from(Buffer.from(__file.content, "base64")))
			} finally {
				this.Lock.get(__file.path)?.Release()
				// Optionally cleanup lock after use (commented out to rely on periodic cleanup)
				// this.cleanupLock(__file.path)
			}
		})
			.then(() => this.CacheRemove(schemaRequest))
			.then(() => HttpResponse.Created())
	}

	@Logger.LogFunction(true)
	async Update(
		schemaRequest: TSchemaRequestUpdate,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		Assert.Var<absStorageProvider>(this.Connection, "Storage connection not set")
		// should accept only name or content or both in data

		const dirName = schemaRequest.entity
		Assert.Var<string>(dirName, "Folder name is required", new HttpErrorBadRequest())

		if (this.Config.options.autocreate && !(await this.Connection.FolderIsExist(dirName)))
			await this.Connection.FolderCreate(dirName)

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)
		Assert.Var<DataTable>(options.Data, `${this.SourceName}: data is not defined`, new HttpErrorBadRequest())

		const updateData = (await options.Data.Rows())[0]

		const selectQueryHelper = this.GenerateSqlSelect(schemaRequest, options)
		const selectQuery = this.GetSqlQuery(selectQueryHelper, options)
		using folderList = await this.Connection.FolderListFiles(dirName).then((dt) => dt.Rename(dirName))

		const files = await folderList.Pick(["name", "path"])
		const filteredFiles = await files.FreeSql({ sqlQuery: selectQuery, returnData: true })

		// add old name
		await filteredFiles.FreeSql({
			sqlQuery: `
                UPDATE ${dirName}
                SET ${FLD_OLD_NAME} = name
            `,
		})

		const updateQueryHelper = await this.GenerateSqlUpdate(schemaRequest, options)
		const updateQuery = this.GetSqlQuery(updateQueryHelper, options)

		await filteredFiles.FreeSql({ sqlQuery: updateQuery })

		// update filteredFiles
		return filteredFiles
			.ForEach(async (row: TRow) => {
				const { name: newFileName, [FLD_OLD_NAME]: oldFileName } = row as TStorageFile & {
					[FLD_OLD_NAME]: string
				}

				Assert.Var<string>(newFileName, "File name is required")
				Assert.Var<string>(oldFileName, "File old name is required")

				const __lock = `${dirName}/${oldFileName}`
				this._setLock(__lock)
				await this.Lock.get(__lock)?.Acquire()

				try {
					// update file content
					const __fileContent = await ReadableUtils.ToBase64(await this.Connection?.FileRead(dirName, oldFileName))

					if (updateData?.content && updateData?.content !== __fileContent) {
						const ___content = updateData?.content ?? __fileContent

						Assert.Var<string>(
							___content,
							StringUtils.IsBase64(___content),
							"content is not a valid base64 string",
							new HttpErrorBadRequest(),
						)

						await this.Connection?.FileWrite(dirName, oldFileName, Readable.from(Buffer.from(___content, "base64")))
					}

					// rename file
					if (oldFileName !== newFileName) await this.Connection?.FileRename(dirName, oldFileName, newFileName)
				} finally {
					this.Lock.get(__lock)?.Release()
					// Optionally cleanup lock after use (commented out to rely on periodic cleanup)
					// this.cleanupLock(__lock)
				}
			})
			.then(() => this.CacheRemove(schemaRequest))
			.then(() => HttpResponse.NoContent())
	}

	@Logger.LogFunction(true)
	async Delete(
		schemaRequest: TSchemaRequestDelete,
		$context?: Partial<TContext>,
	): Promise<TInternalResponse<undefined>> {
		Assert.Condition(
			((this.Config.options as U__source_storage_folders)?.["allow-delete"] as boolean) === true,
			`${this.SourceName}: "allow-delete" option is required to delete files`,
			new HttpErrorForbidden(),
		)

		Assert.Var<absStorageProvider>(this.Connection, "Storage connection not set")

		const { entity: dirName } = schemaRequest
		Assert.Var<string>(dirName, "Folder name is required")

		$context = merge($context, this.GetContext(schemaRequest))

		const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

		const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

		const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

		using files = await this.Connection.FolderListFiles(dirName).then((dt) => dt.Rename(dirName))

		const filesFiltered = await files.FreeSql({ sqlQuery, returnData: true })

		return filesFiltered
			.ForEach(async (row: TRow) => {
				const { name: fileName } = row as TStorageFile
				Assert.Var<absStorageProvider>(this.Connection, "Storage connection not set")
				Assert.Var<string>(fileName, "File name is required")
				await this.Connection.FileDelete(dirName, fileName)
			})
			.then(() => this.CacheRemove(schemaRequest))
			.then(() => HttpResponse.NoContent())
	}

	@Logger.LogFunction(true)
	AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
		throw new HttpErrorNotImplemented()
	}

	@Logger.LogFunction(true)
	async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
		Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

		const { schema } = schemaRequest

		const data = await this.Connection.FolderListFolders()
		return HttpResponse.Ok(<TSchemaResponse>{
			schema,
			...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
			...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
			data,
		})
	}

	EscapeEntity(entity: string): string {
		return entity
	}

	EscapeField(field: string): string {
		return field
	}
}
