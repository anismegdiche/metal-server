//
//
//
//
//
import * as sha512 from 'js-sha512'

import { Source } from './Source'
import { DataTable } from '../types/DataTable'
import { TCacheData } from '../types/TCacheData'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TSchemaResponse, TSchemaResponseData, TTransaction } from '../types/TSchemaResponse'
import { Logger } from '../lib/Logger'
import { Config } from './Config'
import { IProvider } from '../types/IProvider'
import { TInternalResponse } from '../types/TInternalResponse'
import { HTTP_STATUS_CODE, METADATA } from '../lib/Const'


export class Cache {

    static Schema = "metal_cache"
    static Table = "cache"

    public static CacheSource: IProvider

    static #GetSchemaRequest() {
        return <TSchemaRequest>{
            schema: Cache.Schema,
            entity: Cache.Table
        }
    }

    static async Connect() {
        Logger.Debug(`Cache.Connect`)
        if (Config.Flags.EnableCache)
            Source.Connect(null, Config.Get("server.cache"))
    }

    static async Disconnect() {
        Logger.Debug(`Cache.Disconnect`)
        if (Config.Flags.EnableCache)
            await Cache.CacheSource.Disconnect()
    }

    static async Set(schemaRequest: TSchemaRequest, dt: DataTable) {
        if (!Config.Flags.EnableCache ||
            schemaRequest?.cache === undefined ||
            (schemaRequest.schema === Cache.Schema && schemaRequest.entity === Cache.Table)) {
            return
        }

        Logger.Debug(`Cache.Set`)
        if (!schemaRequest?.cache) {
            return;
        }
        const ttl = parseInt((schemaRequest.cache).replace(/['"]/g, ''), 10) ?? 0
        const now = new Date()
        now.setSeconds(now.getSeconds() + ttl)
        const expires = now.getTime()

        const hash = Cache.Hash(schemaRequest)
        const cacheData = await Cache.Get(hash)

        if (cacheData?.datatable === undefined) {
            dt.SetMetaData(METADATA.CACHE, true)
            dt.SetMetaData(METADATA.CACHE_EXPIRE, expires)
            Cache.CacheSource.Insert(<TSchemaRequest>{
                ...Cache.#GetSchemaRequest(),
                data: <TCacheData[]>[
                    {
                        schema: schemaRequest.schema,
                        entity: schemaRequest.entity,
                        hash,
                        expires,
                        request: schemaRequest,
                        datatable: dt
                    }
                ]
            })
            return;
        }
        if (Cache.IsValid(cacheData.expires))
            Logger.Debug("Cache.Set: cache is valid")
        else
            Cache.CacheSource.Update(<TSchemaRequest>{
                ...Cache.#GetSchemaRequest(),
                filter: {
                    hash
                },
                data: <TCacheData[]>[
                    {
                        expires,
                        datatable: dt
                    }
                ]
            })
    }

    static Hash(schemaRequest: TSchemaRequest): string {
        return sha512.sha512(JSON.stringify(schemaRequest))
    }

    static IsValid(expires?: number): boolean {
        const isValid = (expires)
            ? new Date().getTime() <= expires ?? false
            : false

        Logger.Debug(`Cache.IsValid = ${isValid}`)
        return isValid
    }

    // BUG: when caching Plan, datatable is rendered with Fields, Rows (in Pascal case) 
    static async Get(hash: string): Promise<TCacheData | undefined> {
        Logger.Debug(`Cache.Get`)
        if (Config.Flags.EnableCache) {
            let _schemaResponse: TSchemaResponse = await Cache.CacheSource.Select(<TSchemaRequest>{
                ...Cache.#GetSchemaRequest(),
                filter: {
                    hash
                }
            })
            _schemaResponse = _schemaResponse as TSchemaResponseData
            if (_schemaResponse?.data) {
                return <TCacheData>(_schemaResponse.data.Rows[0])
            }
        }
        return undefined
    }

    static async View(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} Cache.View`)
        let schemaResponse: TSchemaResponse = await Cache.CacheSource.Select(Cache.#GetSchemaRequest())
        schemaResponse.transaction = TTransaction.cache_data
        const intRes: TInternalResponse = {
            StatusCode: schemaResponse.status,
            Body: {
                message: 'Cache data'
            }
        }
        schemaResponse = schemaResponse as TSchemaResponseData
        if (schemaResponse?.data && intRes.Body) {
            intRes.Body.data = schemaResponse.data.Rows
        }
        Logger.Debug(`${Logger.Out} Cache.View`)
        return intRes
    }

    static async Purge(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} Cache.Purge`)
        await Cache.CacheSource.Delete(Cache.#GetSchemaRequest())
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
            ...Cache.#GetSchemaRequest(),
            "filter-expression": `expires < ${_expireDate}`
        })
        Logger.Debug(`${Logger.Out} Cache.Clean`)
        return {
            StatusCode: HTTP_STATUS_CODE.OK,
            Body: { message: 'Cache cleaned' }
        }
    }
}