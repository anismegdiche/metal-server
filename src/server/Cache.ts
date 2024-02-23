//
//
//
//
//
import * as Sha512 from 'js-sha512'
//
import { HTTP_STATUS_CODE, METADATA } from '../lib/Const'
import { TCacheData } from '../types/TCacheData'
import { Source } from './Source'
import { DataTable } from '../types/DataTable'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TSchemaResponse, TSchemaResponseData, TRANSACTION } from '../types/TSchemaResponse'
import { Logger } from '../lib/Logger'
import { Config } from './Config'
import { IProvider } from '../types/IProvider'
import { TInternalResponse } from '../types/TInternalResponse'
import { TypeHelper } from '../lib/TypeHelper'


export class Cache {

    static readonly Schema = "metal_cache"
    static readonly Table = "cache"

    static CacheSource: IProvider

    static readonly #SchemaRequest: TSchemaRequest = <TSchemaRequest>{
        schemaName: Cache.Schema,
        entityName: Cache.Table
    }

    static async Connect(): Promise<void> {
        Logger.Debug(`Cache.Connect`)
        if (Config.Flags.EnableCache)
            Source.Connect(null, Config.Get("server.cache"))
    }

    static async Disconnect(): Promise<void> {
        Logger.Debug(`Cache.Disconnect`)
        if (Config.Flags.EnableCache)
            await Cache.CacheSource.Disconnect()
    }

    static async Set(schemaRequest: TSchemaRequest, datatable: DataTable): Promise<void> {
        Logger.Debug(`${Logger.In} Cache.Set: ${JSON.stringify(schemaRequest)}`)
        
        // bypassing 
        if (this.CacheSource == undefined || schemaRequest?.cache !== undefined) {
            return
        }

        if (schemaRequest.schemaName === Cache.Schema && schemaRequest.entityName === Cache.Table) {
            Logger.Debug(`${Logger.Out} Cache.Set: bypassing for schema cache`)
            return
        }

        if (!Config.Flags.EnableCache && schemaRequest?.cache !== undefined) {
            Logger.Debug(`${Logger.Out} Cache.Set: 'server.cache' is not configured, bypassing option 'cache'`)
            return
        }

        const { cache: ttl = 0 } = schemaRequest

        // calculate cache expiration time
        const now = new Date()
        now.setSeconds(now.getSeconds() + ttl)
        const expires = now.getTime()

        // get cached data
        const hash = Cache.Hash(schemaRequest)
        const _expires = await Cache.IsExists(hash)
        // const cacheData = await Cache.Get(hash)

        if (_expires == 0) {
            Logger.Debug(`Cache.Set: no cache found, creating Hash=${hash}`)
            datatable.SetMetaData(METADATA.CACHE, true)
            datatable.SetMetaData(METADATA.CACHE_EXPIRE, expires)
            await Cache.CacheSource.Insert(<TSchemaRequest>{
                ...Cache.#SchemaRequest,
                data: <TCacheData[]>[
                    {
                        hash,
                        expires,
                        schemaRequest,
                        datatable
                    }
                ]
            })
            return
        }

        if (Cache.IsValid(_expires)) {
            Logger.Debug(`Cache.Set: cache is valid, bypassing Hash=${hash}`)
            return
        }

        Logger.Debug(`Cache.Set: cache expired, updating Hash=${hash}`)
        await Cache.CacheSource.Update(<TSchemaRequest>{
            ...Cache.#SchemaRequest,
            filter: {
                hash
            },
            data: <TCacheData[]>[
                {
                    expires,
                    datatable
                }
            ]
        })
    }

    static Hash(schemaRequest: TSchemaRequest): string {
        return Sha512.sha512(JSON.stringify(schemaRequest))
    }

    static IsValid(expires: number): boolean {
        const isValid = expires !== undefined && Date.now() <= expires
        Logger.Info(`Cache.IsValid = ${isValid}`)
        return isValid
    }

    static async Get(cacheHash: string): Promise<TCacheData | undefined> {
        Logger.Debug(`Cache.Get: Hash=${cacheHash}`)
        if (!Config.Flags.EnableCache || this.CacheSource === undefined) {
            return undefined
        }

        const schemaResponse: TSchemaResponse = await Cache.CacheSource.Select(<TSchemaRequest>{
            ...Cache.#SchemaRequest,
            filter: {
                hash: cacheHash
            }
        })

        if (TypeHelper.IsSchemaResponseData(schemaResponse)) {
            Logger.Debug(`Cache.Get: Cache found, Hash=${cacheHash}`)
            return schemaResponse.data.Rows[0] as TCacheData
        }

        Logger.Debug(`Cache.Get: Cache not found, Hash=${cacheHash}`)
        return undefined
    }

    static async IsExists(hash: string): Promise<number> {
        Logger.Debug(`Cache.IsExists`)
        if (!Config.Flags.EnableCache) {
            return 0
        }

        const schemaResponse: TSchemaResponse = await Cache.CacheSource.Select(<TSchemaRequest>{
            ...Cache.#SchemaRequest,
            filter: {
                hash
            }
        })

        if (TypeHelper.IsSchemaResponseData(schemaResponse) && schemaResponse.data.Rows.length > 0) {
            return (schemaResponse.data.Rows[0] as TCacheData).expires
        }
        return 0
    }

    static async View(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} Cache.View`)
        let schemaResponse: TSchemaResponse = await Cache.CacheSource.Select(Cache.#SchemaRequest)
        schemaResponse.transaction = TRANSACTION.CACHE_DATA
        const intRes: TInternalResponse = {
            StatusCode: schemaResponse.status,
            Body: {
                message: 'Cache data'
            }
        }
        schemaResponse = schemaResponse as TSchemaResponseData
        if (TypeHelper.IsSchemaResponseData(schemaResponse) && intRes.Body) {
            intRes.Body.data = schemaResponse.data.Rows
        }
        Logger.Debug(`${Logger.Out} Cache.View`)
        return intRes
    }

    static async Purge(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} Cache.Purge`)
        await Cache.CacheSource.Delete(Cache.#SchemaRequest)
        Logger.Debug(`${Logger.Out} Cache.Purge`)
        return {
            StatusCode: HTTP_STATUS_CODE.OK,
            Body: { message: 'Cache purged' }
        }
    }

    static async Clean(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} Cache.Clean`)
        const _expireDate = new Date().getTime()
        Logger.Debug(`Cache.Clean  ${_expireDate}`)
        await Cache.CacheSource.Delete(<TSchemaRequest>{
            ...Cache.#SchemaRequest,
            filterExpression: `expires < ${_expireDate}`
        })
        Logger.Debug(`${Logger.Out} Cache.Clean`)
        return {
            StatusCode: HTTP_STATUS_CODE.OK,
            Body: { message: 'Cache cleaned' }
        }
    }
}