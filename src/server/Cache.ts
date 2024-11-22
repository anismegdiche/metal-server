//
//
//
//
//
import * as Sha512 from 'js-sha512'
//
import { METADATA } from '../lib/Const'
import { TCacheData } from '../types/TCacheData'
import { Source } from './Source'
import { DataTable } from '../types/DataTable'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { Logger } from '../utils/Logger'
import { Config } from './Config'
import { TInternalResponse } from '../types/TInternalResponse'
import { TypeHelper } from '../lib/TypeHelper'
import { HttpResponse } from "./HttpResponse"
import { TJson } from "../types/TJson"
import { HttpErrorForbidden, HttpErrorInternalServerError } from "./HttpErrors"
import { PERMISSION, Roles } from "./Roles"
import { TUserTokenInfo } from "./User"
import { absDataProvider } from "../providers/absDataProvider"


export class Cache {

    static readonly Schema = "metal_cache"
    static readonly Table = "cache"

    static CacheSource: absDataProvider

    static readonly #CacheSchemaRequest: TSchemaRequest = <TSchemaRequest>{
        schema: Cache.Schema,
        entity: Cache.Table
    }

    @Logger.LogFunction()
    static async Connect(): Promise<void> {
        if (Config.Flags.EnableCache)
            Source.Connect(null, Config.Get("server.cache"))
    }

    @Logger.LogFunction()
    static async Disconnect(): Promise<void> {
        if (Config.Flags.EnableCache)
            await Cache.CacheSource.Disconnect()
    }

    @Logger.LogFunction()
    static async IsExists(hash: string): Promise<number> {
        if (!Config.Flags.EnableCache)
            return 0

        try {
            const internalResponse = await Cache.CacheSource.Select(<TSchemaRequest>{
                ...Cache.#CacheSchemaRequest,
                filter: {
                    hash
                }
            })

            const schemaResponse = internalResponse.Body

            if (!schemaResponse)
                throw new HttpErrorInternalServerError()

            if (TypeHelper.IsSchemaResponseData(schemaResponse) && schemaResponse.data.Rows.length > 0)
                return (schemaResponse.data.Rows[0] as TCacheData).expires

            return 0
        } catch (error) {
            return 0
        }
    }

    @Logger.LogFunction()
    static IsCacheValid(expires: number): boolean {
        return expires !== undefined && Date.now() <= expires
    }

    @Logger.LogFunction()
    static IsArgumentsValid(schemaRequest: TSchemaRequest): boolean {
        // bypassing cache source not defined
        if (this.CacheSource == undefined) {
            return false
        }

        if (schemaRequest.schema === Cache.Schema && schemaRequest.entity === Cache.Table) {
            Logger.Debug(`${Logger.Out} Cache.Set: bypassing for schema cache`)
            return false
        }

        if (!Config.Flags.EnableCache && schemaRequest?.cache !== undefined) {
            Logger.Debug(`${Logger.Out} Cache.Set: 'server.cache' is not configured, bypassing option 'cache'`)
            return false
        }
        return true
    }

    @Logger.LogFunction()
    static Hash(schemaRequest: TSchemaRequest): string {
        return Sha512.sha512(JSON.stringify(schemaRequest))
    }

    @Logger.LogFunction()
    static async Set(schemaRequest: TSchemaRequest, datatable: DataTable): Promise<void> {

        if (!Cache.IsArgumentsValid(schemaRequest))
            return

        const { schema, entity, cache = 0 } = schemaRequest

        // calculate cache expiration time
        const now = new Date()
        now.setSeconds(now.getSeconds() + cache)
        const expires = now.getTime()

        // get cached data
        const hash = Cache.Hash(schemaRequest)
        const _expires = await Cache.IsExists(hash)

        if (_expires == 0) {
            Logger.Debug(`${Logger.Out} Cache.Set: no cache found, creating Hash=${hash}`)
            datatable.SetMetaData(METADATA.CACHE, true)
            datatable.SetMetaData(METADATA.CACHE_EXPIRE, expires)
            await Cache.CacheSource.Insert({
                ...Cache.#CacheSchemaRequest,
                data: <TCacheData[]>[
                    {
                        hash,
                        expires,
                        schema,
                        entity,
                        schemaRequest,
                        data: datatable
                    }
                ]
            })
            return
        }

        if (Cache.IsCacheValid(_expires)) {
            Logger.Debug(`Cache.Set: cache is valid, bypassing Hash=${hash}`)
            return
        }

        Logger.Debug(`Cache.Set: cache expired, updating Hash=${hash}`)
        await Cache.Update(hash, expires, datatable)
    }

    @Logger.LogFunction()
    static async Get(cacheHash: string): Promise<TCacheData | undefined> {
        if (!Config.Flags.EnableCache || this.CacheSource === undefined)
            return undefined

        try {
            const internalResponse = await Cache.CacheSource.Select(<TSchemaRequest>{
                ...Cache.#CacheSchemaRequest,
                filter: {
                    hash: cacheHash
                }
            })

            const schemaResponse = internalResponse.Body

            if (!schemaResponse)
                throw new HttpErrorInternalServerError()

            if (TypeHelper.IsSchemaResponseData(schemaResponse)) {
                Logger.Debug(`Cache.Get: Cache found, Hash=${cacheHash}`)
                return schemaResponse.data.Rows[0] as TCacheData
            }
            throw new Error()

        } catch {
            Logger.Debug(`Cache.Get: Cache not found, Hash=${cacheHash}`)
            return undefined
        }
    }

    static async Update(hash: string, expires: number, datatable: DataTable) {
        await Cache.CacheSource.Update(<TSchemaRequest>{
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
    }

    @Logger.LogFunction()
    static async View(userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TJson>> {
        if (!Roles.HasPermission(userToken, undefined, PERMISSION.ADMIN))
            throw new HttpErrorForbidden('Permission denied')

        return await Cache.CacheSource.Select(Cache.#CacheSchemaRequest)
    }

    @Logger.LogFunction()
    static async Purge(userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TJson>> {
        if (!Roles.HasPermission(userToken, undefined, PERMISSION.ADMIN))
            throw new HttpErrorForbidden('Permission denied')

        await Cache.CacheSource.Delete(Cache.#CacheSchemaRequest)
        Logger.Debug(`${Logger.Out} Cache.Purge`)
        return HttpResponse.Ok({ message: 'Cache purged' })
    }

    @Logger.LogFunction()
    static async Clean(userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TJson>> {
        if (!Roles.HasPermission(userToken, undefined, PERMISSION.ADMIN))
            throw new HttpErrorForbidden('Permission denied')
        
        const _expireDate = new Date().getTime()
        Logger.Debug(`Cache.Clean ${_expireDate}`)
        await Cache.CacheSource.Delete(<TSchemaRequest>{
            ...Cache.#CacheSchemaRequest,
            "filter-expression": `expires < ${_expireDate}`
        })
        Logger.Debug(`${Logger.Out} Cache.Clean`)
        return HttpResponse.Ok({ message: 'Cache cleaned' })
    }

    @Logger.LogFunction()
    static async Remove(schemaRequest: TSchemaRequest): Promise<void> {

        if (!Cache.IsArgumentsValid(schemaRequest))
            return

        const { schema, entity } = schemaRequest

        try {
            await Cache.CacheSource.Delete(<TSchemaRequest>{
                ...Cache.#CacheSchemaRequest,
                //FIXME: only usable with memory provider, should correct escape char ` in where close from sqlhelper
                "filter-expression": `\`schema\`= '${schema}' AND \`entity\`= '${entity}'`
            })
        } catch (error) {
            //
        }
        Logger.Debug(`${Logger.Out} Cache.Removed`)
    }
}