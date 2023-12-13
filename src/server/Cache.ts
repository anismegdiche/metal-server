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
import { HTTP_STATUS_CODE } from '../lib/Const'


export class Cache {

    static Schema = "metal_cache"
    static Table = "cache"

    static #METADATA = {
        CACHE: '__CACHE__',
        CACHE_EXPIRE: '__CACHE_EXPIRE__'
    }

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
        if (schemaRequest?.cache) {
            const _ttl = parseInt((schemaRequest.cache).replace(/['"]/g, ''), 10) ?? 0
            const _expireDate = new Date()
            _expireDate.setSeconds(_expireDate.getSeconds() + _ttl)
            const _timeStamp = _expireDate.getTime()

            const _hash = Cache.Hash(schemaRequest)
            const _cacheData = await Cache.Get(_hash)

            if (_cacheData?.datatable === undefined) {
                dt.SetMetaData(Cache.#METADATA.CACHE, true)
                dt.SetMetaData(Cache.#METADATA.CACHE_EXPIRE, _timeStamp)
                Cache.CacheSource.Insert(<TSchemaRequest>{
                    ...Cache.#GetSchemaRequest(),
                    data: <TCacheData[]>[
                        {
                            schema: schemaRequest.schema,
                            entity: schemaRequest.entity,
                            hash: _hash,
                            expires: _timeStamp,
                            request: schemaRequest,
                            datatable: dt
                        }
                    ]
                })
            } else
                if (Cache.IsValid(_cacheData.expires))
                    Logger.Debug("Cache.Set: cache is valid")
                else
                    Cache.CacheSource.Update(<TSchemaRequest>{
                        ...Cache.#GetSchemaRequest(),
                        filter: {
                            hash: _hash
                        },
                        data: <TCacheData[]>[
                            {
                                expires: _timeStamp,
                                datatable: dt
                            }
                        ]
                    })
        }
    }

    static Hash(schemaRequest: TSchemaRequest): string {
        return sha512.sha512(JSON.stringify(schemaRequest))
    }

    static IsValid(expires?: number): boolean {
        let isValid = false
        if (expires)
            isValid = new Date().getTime() <= expires ?? false
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
            if ((<TSchemaResponseData>_schemaResponse)?.data) {
                _schemaResponse = <TSchemaResponseData>_schemaResponse
                return <TCacheData>(_schemaResponse.data.Rows[0])
            }
        }
        return undefined
    }

    static async View(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} Cache.ViewData`)
        const schemaResponse: TSchemaResponse = await Cache.CacheSource.Select(Cache.#GetSchemaRequest())
        schemaResponse.transaction = TTransaction.cache_data
        Logger.Debug(`${Logger.Out} Cache.ViewData`)
        let _intRes: TInternalResponse = {
            StatusCode: schemaResponse.status,
            Body: {
                message: 'Cache data'
            }
        }
        if ((<TSchemaResponseData>schemaResponse)?.data  && _intRes.Body) {
            _intRes.Body.data = (<TSchemaResponseData>schemaResponse).data.Rows
        }
        return _intRes
    }

    static async Purge(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} Cache.Purge`)
        await Cache.CacheSource.Delete(Cache.#GetSchemaRequest())
        Logger.Debug(`${Logger.Out} Cache.Purge`)
        return <TInternalResponse>{
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
        return <TInternalResponse>{
            StatusCode: HTTP_STATUS_CODE.OK,
            Body: { message: 'Cache cleaned' }
        }
    }

}