//
//
//
//
//
import * as sha512 from 'js-sha512'

import { Source } from '../interpreter/Source'
import { DataTable } from '../types/DataTable'
import { TCacheData } from '../types/TCacheData'
import { TDataRequest } from '../types/TDataRequest'
import { TDataResponse, TDataResponseData, TTransaction } from '../types/TDataResponse'
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

    static #GetDataRequest() {
        return <TDataRequest>{
            schema: Cache.Schema,
            entity: Cache.Table
        }
    }


    static async Connect() {
        Logger.Debug(`CacheData.Connect`)
        if (Config.Flags.EnableCache)
            Source.Connect(null, Config.Configuration.server.cache)
    }

    static async Disconnect() {
        Logger.Debug(`CacheData.Disconnect`)
        if (Config.Flags.EnableCache)
            await Cache.CacheSource.Disconnect()
    }

    static async Set(dataRequest: TDataRequest, dt: DataTable) {
        if (!Config.Flags.EnableCache ||
            dataRequest?.cache === undefined ||
            (dataRequest.schema === Cache.Schema && dataRequest.entity === Cache.Table)) {
            return
        }

        Logger.Debug(`CacheData.Set`)
        if (dataRequest?.cache) {
            const _ttl = parseInt((dataRequest.cache).replace(/['"]/g, ''), 10) ?? 0
            const _expireDate = new Date()
            _expireDate.setSeconds(_expireDate.getSeconds() + _ttl)
            const _timeStamp = _expireDate.getTime()

            const _hash = Cache.Hash(dataRequest)
            const _cacheData = await Cache.Get(_hash)

            if (_cacheData?.datatable === undefined) {
                dt.SetMetaData(Cache.#METADATA.CACHE, true)
                dt.SetMetaData(Cache.#METADATA.CACHE_EXPIRE, _timeStamp)
                Cache.CacheSource.Insert(<TDataRequest>{
                    ...Cache.#GetDataRequest(),
                    data: <TCacheData[]>[
                        {
                            schema: dataRequest.schema,
                            entity: dataRequest.entity,
                            hash: _hash,
                            expires: _timeStamp,
                            request: dataRequest,
                            datatable: dt
                        }
                    ]
                })
            } else
                if (Cache.IsValid(_cacheData.expires))
                    Logger.Debug("CacheData.Set: cache is valid")
                else
                    Cache.CacheSource.Update(<TDataRequest>{
                        ...Cache.#GetDataRequest(),
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

    static Hash(dataRequest: TDataRequest): string {
        return sha512.sha512(JSON.stringify(dataRequest))
    }

    static IsValid(expires?: number): boolean {
        let _isValid = false
        if (expires)
            _isValid = new Date().getTime() <= expires ?? false
        Logger.Debug(`CacheData.IsValid = ${_isValid}`)
        return _isValid
    }

    // BUG: when caching Plan, datatable is rendered with Fields, Rows (in Pascal case) 
    static async Get(hash: string): Promise<TCacheData | undefined> {
        Logger.Debug(`CacheData.Get`)
        if (Config.Flags.EnableCache) {
            let _dataResponse: TDataResponse = await Cache.CacheSource.Select(<TDataRequest>{
                ...Cache.#GetDataRequest(),
                filter: {
                    hash
                }
            })
            if ((<TDataResponseData>_dataResponse)?.data) {
                _dataResponse = <TDataResponseData>_dataResponse
                return <TCacheData>(_dataResponse.data.Rows[0])
            }
        }
        return undefined
    }

    static async View(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} Cache.ViewData`)
        const _dataResponse: TDataResponse = await Cache.CacheSource.Select(Cache.#GetDataRequest())
        _dataResponse.transaction = TTransaction.cache_data
        Logger.Debug(`${Logger.Out} Cache.ViewData`)
        let _intRes: TInternalResponse = {
            StatusCode: _dataResponse.status,
            Body: {
                message: 'Cache data'
            }
        }
        if ((<TDataResponseData>_dataResponse)?.data  && _intRes.Body) {
            _intRes.Body.data = (<TDataResponseData>_dataResponse).data.Rows
        }
        return _intRes
    }

    static async Purge(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} CacheData.Purge`)
        await Cache.CacheSource.Delete(Cache.#GetDataRequest())
        Logger.Debug(`${Logger.Out} CacheData.Purge`)
        return <TInternalResponse>{
            StatusCode: HTTP_STATUS_CODE.OK,
            Body: { message: 'Cache purged' }
        }
    }

    static async Clean(): Promise<TInternalResponse> {
        Logger.Debug(`${Logger.In} CacheData.Clean`)
        const _expireDate = new Date().getTime()
        Logger.Debug(`CacheData.Clean  ${_expireDate}`)
        await Cache.CacheSource.Delete(<TDataRequest>{
            ...Cache.#GetDataRequest(),
            "filter-expression": `expires < ${_expireDate}`
        })
        Logger.Debug(`${Logger.Out} CacheData.Clean`)
        return <TInternalResponse>{
            StatusCode: HTTP_STATUS_CODE.OK,
            Body: { message: 'Cache cleaned' }
        }
    }

}