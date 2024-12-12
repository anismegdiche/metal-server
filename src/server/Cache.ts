//
//
//
//
//
import * as Sha512 from 'js-sha512'
import typia from "typia"
//
import { METADATA, RESPONSE } from '../lib/Const'
import { TCacheData } from '../types/TCacheData'
import { Source } from './Source'
import { DataTable } from '../types/DataTable'
import { TSchemaRequest, TSchemaRequestSelect } from '../types/TSchemaRequest'
import { Logger } from '../utils/Logger'
import { Config } from './Config'
import { TInternalResponse } from '../types/TInternalResponse'
import { TypeHelper } from '../lib/TypeHelper'
import { HttpResponse } from './HttpResponse'
import { TJson } from "../types/TJson"
import { HttpError, HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorLog, HttpErrorNotFound } from "./HttpErrors"
import { PERMISSION, Roles } from "./Roles"
import { TUserTokenInfo } from "./User"
import { absDataProvider } from "../providers/absDataProvider"
import { Schema } from "./Schema"
import { TSchemaResponse } from "../types/TSchemaResponse"


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
        } catch {
            return 0
        }
    }

    @Logger.LogFunction()
    static IsCacheValid(expires: number): boolean {
        return expires !== undefined && Date.now() <= expires
    }

    @Logger.LogFunction()
    static IsArgumentsValid(schemaRequest: TSchemaRequest): boolean {
        const isSchemaCacheRequest = Cache.IsSchemaCacheRequest(schemaRequest)
        const isConfigurationGood = Cache.IsConfigurationGood(schemaRequest)
        const isParametersDefined = Cache.IsParametersDefined(schemaRequest)

        return isSchemaCacheRequest && isConfigurationGood && isParametersDefined
    }

    static IsSchemaCacheRequest(schemaRequest: TSchemaRequest): boolean {
        if (schemaRequest.schema === Cache.Schema && schemaRequest.entity === Cache.Table) {
            Logger.Debug(`${Logger.Out} bypassing: schema cache request`)
            return false
        }
        return true
    }

    static IsConfigurationGood(schemaRequest: TSchemaRequest): boolean {
        if (!Config.Flags.EnableCache && schemaRequest?.cache) {
            Logger.Warn(`${Logger.Out} 'server.cache' is not configured, bypassing option 'cache'`)
            return false
        }
        return true
    }

    static IsParametersDefined(schemaRequest: TSchemaRequest): boolean {
        if (!Config.Flags.EnableCache)
            return false

        if (this.CacheSource === undefined)
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
    static async Set(schemaRequest: TSchemaRequest, datatable: DataTable): Promise<void> {

        if (!Cache.IsArgumentsValid(schemaRequest))
            return

        // remove source from schemaRequest
        delete schemaRequest.source

        const { schema, entity, cache = 0 } = schemaRequest

        // calculate cache expiration time
        const now = new Date()
        now.setSeconds(now.getSeconds() + cache)
        const expires = now.getTime()

        // get cached data
        const hash = Cache.Hash(schemaRequest)
        const cacheExpires = await Cache.IsExists(hash)

        if (cacheExpires == 0) {
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

        if (Cache.IsCacheValid(cacheExpires)) {
            Logger.Debug(`Cache.Set: cache is valid, bypassing Hash=${hash}`)
            return
        }

        Logger.Debug(`Cache.Set: cache expired, updating Hash=${hash}`)
        Cache.Update(hash, expires, datatable)
    }

    @Logger.LogFunction()
    static async Get(schemaRequest: TSchemaRequestSelect, userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TSchemaResponse | undefined>> {

        TypeHelper.Validate(typia.validateEquals<TSchemaRequestSelect>(schemaRequest),
            new HttpErrorBadRequest(`Bad arguments passed: ${JSON.stringify(schemaRequest)}`))

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, PERMISSION.READ)

        if (!Cache.IsArgumentsValid(schemaRequest))
            return HttpResponse.NoContent()

        const cacheHash = Cache.Hash(schemaRequest)

        const intResp = await Cache.CacheSource.Select(<TSchemaRequest>{
            ...Cache.#CacheSchemaRequest,
            filter: {
                hash: cacheHash
            }
        })

        // no data
        if (!intResp.Body || intResp.Body.data.Rows.length === 0) {
            Logger.Debug(`Cache.Get: Cache not found, Hash=${cacheHash}`)
            throw new HttpErrorNotFound(`Cache not found, Hash=${cacheHash}`)
        }

        // return data
        const { data, expires } = intResp.Body.data.Rows.at(0) as TCacheData

        if (!Cache.IsCacheValid(expires))
            throw new HttpErrorNotFound(`Cache is old, Hash=${cacheHash}`)

        return HttpResponse.Ok(<TSchemaResponse>{
            entity,
            schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    static async Update(hash: string, expires: number, datatable: DataTable) {
        Cache.CacheSource.Update(<TSchemaRequest>{
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
        Roles.CheckPermission(userToken, undefined, PERMISSION.ADMIN)
        return await Cache.CacheSource.Select(Cache.#CacheSchemaRequest)
    }

    @Logger.LogFunction()
    static async Purge(userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, PERMISSION.ADMIN)

        await Cache.CacheSource.Delete(Cache.#CacheSchemaRequest)
        Logger.Debug(`${Logger.Out} Cache.Purge`)
        return HttpResponse.Ok({ message: 'Cache purged' })
    }

    @Logger.LogFunction()
    static async Clean(userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, PERMISSION.ADMIN)

        const expiresNow = new Date().getTime()
        Logger.Debug(`Cache.Clean ${expiresNow}`)
        await Cache.CacheSource.Delete(<TSchemaRequest>{
            ...Cache.#CacheSchemaRequest,
            "filter-expression": `expires < ${expiresNow}`
        })
        Logger.Debug(`${Logger.Out} Cache.Clean`)
        return HttpResponse.Ok({ message: 'Cache cleaned' })
    }

    @Logger.LogFunction()
    static async Remove(schemaRequest: TSchemaRequest): Promise<void> {

        if (!Cache.IsArgumentsValid(schemaRequest))
            return

        const { schema, entity } = schemaRequest

        Cache.CacheSource.Delete(<TSchemaRequest>{
            ...Cache.#CacheSchemaRequest,
            "filter-expression": `${Cache.CacheSource.EscapeField("schema")}= '${schema}' AND ${Cache.CacheSource.EscapeField("entity")}= '${entity}'`
        })
            .catch((error: HttpError | Error) => HttpErrorLog(error))
        Logger.Debug(`${Logger.Out} Cache.Removed`)
    }
}