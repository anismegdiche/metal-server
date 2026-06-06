//

//
//
import * as Sha512 from "js-sha512"
//
import type { DataTable } from "../../types/DataTable"
import type { TJson } from "../../types/TJson"
import { Assert } from "../../utils/Assert"
import { Logger } from "../../utils/Logger"
import { Semaphore } from "../../utils/Semaphore"
import { SynchronizerManager } from "../../utils/SynchronizerManager"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { METADATA, RESPONSE } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { Global } from "../core/Global"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import type { U__schemas_schema } from "../core/types/U__schemas"
import type { U__sources_source } from "../core/types/U__sources"
import { type HttpError, HttpErrorBadRequest, HttpErrorLog, HttpErrorNotFound } from "../errors/HttpErrors"
import {
	type TSchemaRequest,
	type TSchemaRequestDelete,
	type TSchemaRequestInsert,
	type TSchemaRequestSelect,
	type TSchemaRequestUpdate,
	z_TSchemaRequestSelect,
} from "../schema/types/TSchemaRequest"
import { type TSchemaResponse, z_TSchemaResponse } from "../schema/types/TSchemaResponse"
import type { IDataProvider } from "../source/base/IDataProvider"
import type { TCacheData } from "./@types"

// Exports
export class Cache {
	static readonly DEFAULT = {
		database: "metal_cache",
		entity: "cache",
	}

	static Database = Cache.DEFAULT.database 
	static Entity = Cache.DEFAULT.entity 
	static DataSource: IDataProvider 
	static DataSourceConfig: U__sources_source
	static __LOCK__: Semaphore = new Semaphore(1) 
	static _cacheSchemaRequest: TSchemaRequest = <TSchemaRequest>{
		//NOSNAR
		schema: Cache.Database,
		entity: Cache.Entity,
	}

	static IsEnabled = false 

	static Index = new Map<string, number>()
	static AutoCleanupInterval: NodeJS.Timeout | undefined
	static AutoCleanupIntervalMs = 3600000 // 1 hour

	@Logger.LogFunction()
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	static async Init(fnDataProvider_GetProvider: Function): Promise<void> {
		Cache.IsEnabled = ConfigManager.Has("server.cache")
		if (!Cache.IsEnabled) return

		Cache.DataSourceConfig = ConfigManager.Get<U__sources_source>("server.cache")
		Cache.Database = Cache.DataSourceConfig.database ?? Cache.DEFAULT.database
		Cache._cacheSchemaRequest = <TSchemaRequest>{
			schema: Cache.Database,
			entity: Cache.Entity,
		}
		Cache.DataSource = await fnDataProvider_GetProvider(Cache.DataSourceConfig.provider)
		await Cache.DataSource.Init(Cache.Database, Cache.DataSourceConfig)
		// update Config
		Global.Cache = {
			Database: Cache.Database,
			Entity: Cache.Entity,
		}

		Cache.StartAutoCleanup()
	}

	@Logger.LogFunction()
	static async Connect(): Promise<void> {
		if (!Cache.IsEnabled) return

		await Cache.DataSource.Connect()
		await Cache.GetHashList()
	}

	@Logger.LogFunction()
	static async Disconnect(): Promise<void> {
		Cache.StopAutoCleanup()
		if (Cache.IsEnabled) await Cache.DataSource.Disconnect()
	}

	@Logger.LogFunction()
	static async GetHashList(): Promise<void> {
		try {
			const intResp = await Cache.DataSource.Select(<TSchemaRequestSelect>{
				...Cache._cacheSchemaRequest,
				fields: "hash,expires",
			})

			const schemaResponse = intResp.Body

			const isSchemaResponse = z_TSchemaResponse.safeParse(schemaResponse).success
			Cache.Index =
				isSchemaResponse && schemaResponse && (await schemaResponse.data.Count()) > 0
					? new Map(((await schemaResponse.data.Rows()) as TCacheData[]).map((row) => [row.hash, row.expires]))
					: new Map()
		} catch {
			Cache.Index = new Map()
		}
	}

	@Logger.LogFunction()
	static async IsHashExists(hash: string): Promise<boolean> {
		return Cache.Index.has(hash)
	}

	@Logger.LogFunction()
	static async GetExpires(hash: string): Promise<number> {
		return Cache.Index.get(hash) ?? 0
	}

	@Logger.LogFunction()
	static IsCacheValid(expires?: number): boolean {
		const isValid = expires !== undefined && Date.now() <= expires
		Logger.Debug(`${Logger.Out} Cache.IsCacheValid: ${isValid}`)
		return isValid
	}

	@Logger.LogFunction(true)
	static IsArgumentsValid(schemaRequest: TSchemaRequest): boolean {
		const isSchemaCacheRequest = Cache.IsSchemaCacheRequest(schemaRequest)
		const isConfigurationGood = Cache.IsConfigurationGood(schemaRequest)
		const isParametersDefined = Cache.IsParametersDefined(schemaRequest)

		return isSchemaCacheRequest && isConfigurationGood && isParametersDefined
	}

	static IsSchemaCacheRequest(schemaRequest: TSchemaRequest): boolean {
		if (schemaRequest.schema === Cache.Database && "entity" in schemaRequest && schemaRequest.entity === Cache.Entity) {
			Logger.Debug(`${Logger.Out} bypassing: schema cache request`)
			return false
		}
		return true
	}

	static IsConfigurationGood(schemaRequest: TSchemaRequest): boolean {
		if (!Cache.IsEnabled && (<TSchemaRequestSelect>schemaRequest)?.cache) {
			Logger.Warn(`${Logger.Out} 'server.cache' is not configured, bypassing option 'cache'`)
			return false
		}
		return true
	}

	static IsParametersDefined(schemaRequest: TSchemaRequest): boolean {
		if (!Cache.IsEnabled) return false

		if (Cache.DataSource === undefined) return false

		if (!(<TSchemaRequestSelect>schemaRequest)?.cache) return false

		return true
	}

	@Logger.LogFunction()
	static Hash(schemaRequest: TSchemaRequest): string {
		return Sha512.sha512(JSON.stringify(schemaRequest))
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	static async Set(schemaRequest: TSchemaRequest, datatable: DataTable): Promise<void> {
		if (!Cache.IsArgumentsValid(schemaRequest)) return

		// remove source from schemaRequest
		delete schemaRequest.source

		const { schema, entity, cache = 0 } = schemaRequest as TSchemaRequestSelect

		// calculate cache expiration time
		const now = new Date()
		now.setSeconds(now.getSeconds() + cache)
		const expiresNow = now.getTime()

		const hash = Cache.Hash(schemaRequest)
		const isHashExists = await Cache.IsHashExists(hash)

		if (!isHashExists) {
			Logger.Debug(`${Logger.Out} Cache.Set: no cache found, creating Hash=${hash}`)
			datatable.MetaDataSet(METADATA.CACHE, true)
			datatable.MetaDataSet(METADATA.CACHE_EXPIRE, expiresNow)
			await Cache.__LOCK__.Acquire()
			await Cache.DataSource.Insert(<TSchemaRequestInsert>{
				...Cache._cacheSchemaRequest,
				data: <TCacheData[]>[
					{
						hash,
						expires: expiresNow,
						schema,
						entity,
						schemaRequest,
						data: datatable,
					},
				],
			})
			Cache.Index.set(hash, expiresNow)
			Cache.__LOCK__.Release()
			return
		}

		const expires = await Cache.GetExpires(hash)

		if (Cache.IsCacheValid(expires)) {
			Logger.Debug(`Cache.Set: cache is valid, bypassing Hash=${hash}`)
			return
		}

		Logger.Debug(`Cache.Set: cache expired, updating Hash=${hash}`)
		Cache.Update(hash, expiresNow, datatable)
		Cache.Index.set(hash, expiresNow)
	}

	@Logger.LogFunction()
	@SynchronizerManager.Synchronized()
	static async Get(
		schemaRequest: TSchemaRequestSelect,
		userToken?: TUserTokenInfo,
	): Promise<TInternalResponse<TSchemaResponse> | undefined> {
		Assert.Var<TSchemaRequestSelect>(
			schemaRequest,
			z_TSchemaRequestSelect.safeParse(schemaRequest).success,
			`Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
			new HttpErrorBadRequest(),
		)

		const { schema, entity } = schemaRequest

		const schemaConfig = ConfigManager.Get<U__schemas_schema>(`schemas.${schema}`)
		if (!schemaConfig) throw new HttpErrorNotFound(`Schema '${schema}' not found`)

		Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.READ)

		if (!Cache.IsArgumentsValid(schemaRequest)) return undefined

		const hash = Cache.Hash(schemaRequest)
		const expires = await Cache.GetExpires(hash)

		if (!Cache.IsCacheValid(expires)) {
			Logger.Debug(`Cache is old, Hash=${hash}`)
			return undefined
		}

		const intResp = await Cache.DataSource.Select(<TSchemaRequestSelect>{
			...Cache._cacheSchemaRequest,
			filter: {
				hash,
			},
		}).catch((err) => {
			Logger.Error(err)
			return undefined
		})

		// no data
		if (!intResp?.Body || (await intResp.Body.data.Count()) === 0) {
			Logger.Debug(`Cache.Get: Cache not found, Hash=${hash}`)
			return undefined
		}

		// return data
		const { data } = (await intResp.Body.data.Row(0)) as TCacheData

		return HttpResponse.Ok(<TSchemaResponse>{
			entity,
			schema,
			...RESPONSE.SELECT.SUCCESS.MESSAGE,
			...RESPONSE.SELECT.SUCCESS.STATUS,
			data,
		})
	}

	static async Update(hash: string, expires: number, datatable: DataTable) {
		Cache.DataSource.Update(<TSchemaRequestUpdate>{
			...Cache._cacheSchemaRequest,
			filter: {
				hash,
			},
			data: <TCacheData[]>[
				{
					expires,
					data: datatable,
				},
			],
		})
		Cache.Index.set(hash, expires)
	}

	@Logger.LogFunction()
	static async View(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
		Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)
		return Cache.DataSource.Select(Cache._cacheSchemaRequest as TSchemaRequestSelect)
	}

	@Logger.LogFunction()
	static async Purge(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
		Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

		await Cache.DataSource.Delete(Cache._cacheSchemaRequest as TSchemaRequestDelete)
		Cache.Index.clear()

		Logger.Debug(`${Logger.Out} Cache.Purge`)
		return HttpResponse.Ok({ message: "Cache purged" })
	}

	@Logger.LogFunction()
	static async Clean(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
		Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

		const expiresNow = Date.now()

		Logger.Debug(`Cache.Clean ${expiresNow}`)
		await Cache.DataSource.Delete(<TSchemaRequestDelete>{
			...Cache._cacheSchemaRequest,
			"filter-expression": `expires < ${expiresNow}`,
		})

		Cache.Index.forEach(async (expires, hash) => {
			if (expires < expiresNow) {
				Cache.Index.delete(hash)
			}
		})

		Logger.Debug(`${Logger.Out} Cache.Clean`)
		return HttpResponse.Ok({ message: "Cache cleaned" })
	}

	@Logger.LogFunction(true)
	@SynchronizerManager.Synchronized()
	static async Remove(schemaRequest: TSchemaRequest): Promise<void> {
		if (!Cache.IsArgumentsValid(schemaRequest)) return

		const { schema, entity } = schemaRequest as TSchemaRequestSelect

		Cache.DataSource.Delete(<TSchemaRequestDelete>{
			...Cache._cacheSchemaRequest,
			"filter-expression": `${Cache.DataSource.EscapeField("schema")}= '${schema}' AND ${Cache.DataSource.EscapeField("entity")}= '${entity}'`,
		}).catch((error: HttpError | Error) => HttpErrorLog(error))

		Cache.Index.delete(Cache.Hash(schemaRequest))

		Logger.Debug(`${Logger.Out} Cache.Removed`)
	}

	static StartAutoCleanup(intervalMs: number = Cache.AutoCleanupIntervalMs) {
		Cache.StopAutoCleanup()

		Logger.Info(`Cache auto-cleanup started (interval: ${intervalMs}ms)`)
		Cache.AutoCleanupInterval = setInterval(async () => {
			const expiresNow = Date.now()
			// Clean Index Map
			let cleanedCount = 0
			Cache.Index.forEach((expires, hash) => {
				if (expires < expiresNow) {
					Cache.Index.delete(hash)
					cleanedCount++
				}
			})

			if (cleanedCount > 0) {
				Logger.Debug(`Cache auto-cleanup: Removed ${cleanedCount} expired items from memory index`)
			}

			// Clean DataSource
			try {
				if (Cache.DataSource) {
					await Cache.DataSource.Delete(<TSchemaRequestDelete>{
						...Cache._cacheSchemaRequest,
						"filter-expression": `expires < ${expiresNow}`,
					})
				}
			} catch (e) {
				Logger.Error(`Cache.AutoCleanup error: ${e}`)
			}
		}, intervalMs)
	}

	static StopAutoCleanup() {
		if (Cache.AutoCleanupInterval) {
			clearInterval(Cache.AutoCleanupInterval)
			Cache.AutoCleanupInterval = undefined
			Logger.Debug("Cache auto-cleanup stopped")
		}
	}
}
