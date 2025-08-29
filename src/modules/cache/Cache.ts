// External dependencies
import * as Sha512 from 'js-sha512'

// Types and interfaces
import { DataTable } from '../../types/DataTable'
import { TJson } from "../../types/TJson"

// Utils
import { Logger } from '../../utils/Logger'
import { Semaphore } from "../../utils/Semaphore"
import { SynchronizerManager } from "../../utils/SynchronizerManager"
import { TypeUtils } from '../../utils/TypeUtils'

// Auth
import { AUTH_PERMISSION } from "../auth/@consts"
import { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"

// Core
import { Assert } from '../../utils/Assert'
import { METADATA, RESPONSE } from '../core/@consts'
import { ConfigManager } from '../core/ConfigManager'
import { Global } from '../core/Global'
import { HttpResponse } from '../core/HttpResponse'
import { TConfigSchema } from '../core/types/TConfig'

// Errors
import { HttpError, HttpErrorBadRequest, HttpErrorLog, HttpErrorNotFound } from "../errors/HttpErrors"

// Schema
import { TInternalResponse } from "../schema/types/TInternalResponse"
import { TSchemaRequest, TSchemaRequestSelect } from "../schema/types/TSchemaRequest"
import { TSchemaResponse } from "../schema/types/TSchemaResponse"

// Data providers
import { IDataProvider } from "../source/base/IDataProvider"
import { TConfigSource } from "../source/types/TConfigSource"

// Cache types
import { TCacheData } from './types/TCacheData'

// Exports
export class Cache {

    static readonly DEFAULT = {
        database: "metal_cache",
        entity: "cache"
    }

    static Database = Cache.DEFAULT.database //NOSONAR
    static Entity = Cache.DEFAULT.entity     //NOSONAR

    static DataSource: IDataProvider //NOSONAR

    static DataSourceConfig: TConfigSource

    static #__LOCK__: Semaphore = new Semaphore(1) //NOSONAR

    static #CacheSchemaRequest: TSchemaRequest = <TSchemaRequest>{ //NOSNAR
        schema: Cache.Database,
        entity: Cache.Entity
    }

    static IsEnabled = false //NOSONAR

    static Index = new Map<string, number>()

    @Logger.LogFunction()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static async Init(fnDataProvider_GetProvider: Function): Promise<void> {
        Cache.IsEnabled = ConfigManager.Has('server.cache')
        if (!Cache.IsEnabled)
            return

        Cache.DataSourceConfig = ConfigManager.Get<TConfigSource>("server.cache")
        Cache.Database = Cache.DataSourceConfig.database ?? Cache.DEFAULT.database
        Cache.#CacheSchemaRequest = <TSchemaRequest>{
            schema: Cache.Database,
            entity: Cache.Entity
        }
        Cache.DataSource = fnDataProvider_GetProvider(Cache.DataSourceConfig.provider)
        await Cache.DataSource.Init(Cache.Database, Cache.DataSourceConfig)
        // update Config
        Global.Cache = {
            Database: Cache.Database,
            Entity: Cache.Entity
        }
    }

    @Logger.LogFunction()
    static async Connect(): Promise<void> {
        if (!Cache.IsEnabled)
            return

        await Cache.DataSource.Connect()
        await Cache.GetHashList()
    }

    @Logger.LogFunction()
    static async Disconnect(): Promise<void> {
        if (Cache.IsEnabled)
            await Cache.DataSource.Disconnect()
    }

    @Logger.LogFunction()
    static async GetHashList(): Promise<void> {
        try {
            const intResp = await Cache.DataSource.Select(<TSchemaRequest>{
                ...Cache.#CacheSchemaRequest,
                fields: "hash,expires"
            })

            const schemaResponse = intResp.Body

            Cache.Index = schemaResponse && TypeUtils.IsSchemaResponseWithData(schemaResponse)
                ? new Map((schemaResponse.data.Rows as TCacheData[]).map(row => [row.hash, row.expires]))
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
        if (schemaRequest.schema === Cache.Database && schemaRequest.entity === Cache.Entity) {
            Logger.Debug(`${Logger.Out} bypassing: schema cache request`)
            return false
        }
        return true
    }

    static IsConfigurationGood(schemaRequest: TSchemaRequest): boolean {
        if (!Cache.IsEnabled && schemaRequest?.cache) {
            Logger.Warn(`${Logger.Out} 'server.cache' is not configured, bypassing option 'cache'`)
            return false
        }
        return true
    }

    static IsParametersDefined(schemaRequest: TSchemaRequest): boolean {
        if (!Cache.IsEnabled)
            return false

        if (this.DataSource === undefined)
            return false

        if (!schemaRequest?.cache)
            return false

        return true
    }

    @Logger.LogFunction()
    static Hash(schemaRequest: TSchemaRequest): string {
        return Sha512.sha512(JSON.stringify(schemaRequest))
    }

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized()
    static async Set(schemaRequest: TSchemaRequest, datatable: DataTable): Promise<void> {

        if (!Cache.IsArgumentsValid(schemaRequest))
            return

        // remove source from schemaRequest
        delete schemaRequest.source

        const { schema, entity, cache = 0 } = schemaRequest

        // calculate cache expiration time
        const now = new Date()
        now.setSeconds(now.getSeconds() + cache)
        const expiresNow = now.getTime()

        const hash = Cache.Hash(schemaRequest)
        const isHashExists = await Cache.IsHashExists(hash)

        if (!isHashExists) {
            Logger.Debug(`${Logger.Out} Cache.Set: no cache found, creating Hash=${hash}`)
            datatable.SetMetaData(METADATA.CACHE, true)
            datatable.SetMetaData(METADATA.CACHE_EXPIRE, expiresNow)
            await Cache.#__LOCK__.Acquire()
            await Cache.DataSource.Insert({
                ...Cache.#CacheSchemaRequest,
                data: <TCacheData[]>[
                    {
                        hash,
                        expires: expiresNow,
                        schema,
                        entity,
                        schemaRequest,
                        data: datatable
                    }
                ]
            })
            Cache.Index.set(hash, expiresNow)
            Cache.#__LOCK__.Release()
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
    static async Get(schemaRequest: TSchemaRequestSelect, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse> | undefined> {

        Assert.Var<TSchemaRequestSelect>(schemaRequest, 
            TypeUtils.IsSchemaRequestSelect(schemaRequest),
             `Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
             new HttpErrorBadRequest()
            )

        const { schema, entity } = schemaRequest

        const schemaConfig = ConfigManager.Get<TConfigSchema>(`schemas.${schema}`)
        if (!schemaConfig)
            throw new HttpErrorNotFound(`Schema '${schema}' not found`)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.READ)

        if (!Cache.IsArgumentsValid(schemaRequest))
            return undefined

        const hash = Cache.Hash(schemaRequest)
        const expires = await Cache.GetExpires(hash)

        if (!Cache.IsCacheValid(expires)) {
            Logger.Debug(`Cache is old, Hash=${hash}`)
            return undefined
        }

        const intResp = await Cache.DataSource.Select(<TSchemaRequest>{
            ...Cache.#CacheSchemaRequest,
            filter: {
                hash
            }
        })
            .then()
            .catch((err) => {
                Logger.Error(err)
                return undefined
            })

        // no data
        if (!intResp?.Body || intResp.Body.data.Rows.length === 0) {
            Logger.Debug(`Cache.Get: Cache not found, Hash=${hash}`)
            return undefined
        }

        // return data
        const { data } = intResp.Body.data.Rows.at(0) as TCacheData

        return HttpResponse.Ok(<TSchemaResponse>{
            entity,
            schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    static async Update(hash: string, expires: number, datatable: DataTable) {
        Cache.DataSource.Update(<TSchemaRequest>{
            ...Cache.#CacheSchemaRequest,
            filter: {
                hash
            },
            data: <TCacheData[]>[
                {
                    expires,
                    data: datatable
                }
            ]
        })
        Cache.Index.set(hash, expires)
    }

    @Logger.LogFunction()
    static async View(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)
        return await Cache.DataSource.Select(Cache.#CacheSchemaRequest)
    }

    @Logger.LogFunction()
    static async Purge(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

        await Cache.DataSource.Delete(Cache.#CacheSchemaRequest)
        Cache.Index.clear()

        Logger.Debug(`${Logger.Out} Cache.Purge`)
        return HttpResponse.Ok({ message: 'Cache purged' })
    }

    @Logger.LogFunction()
    static async Clean(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

        const expiresNow = new Date().getTime()

        Logger.Debug(`Cache.Clean ${expiresNow}`)
        await Cache.DataSource.Delete(<TSchemaRequest>{
            ...Cache.#CacheSchemaRequest,
            "filter-expression": `expires < ${expiresNow}`
        })

        Cache.Index.forEach(async (expires, hash) => {
            if (expires < expiresNow) {
                Cache.Index.delete(hash)
            }
        })

        Logger.Debug(`${Logger.Out} Cache.Clean`)
        return HttpResponse.Ok({ message: 'Cache cleaned' })
    }

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized()
    static async Remove(schemaRequest: TSchemaRequest): Promise<void> {

        if (!Cache.IsArgumentsValid(schemaRequest))
            return

        const { schema, entity } = schemaRequest

        Cache.DataSource.Delete(<TSchemaRequest>{
            ...Cache.#CacheSchemaRequest,
            "filter-expression": `${Cache.DataSource.EscapeField("schema")}= '${schema}' AND ${Cache.DataSource.EscapeField("entity")}= '${entity}'`
        })
            .catch((error: HttpError | Error) => HttpErrorLog(error))

        Cache.Index.delete(Cache.Hash(schemaRequest))

        Logger.Debug(`${Logger.Out} Cache.Removed`)
    }
}