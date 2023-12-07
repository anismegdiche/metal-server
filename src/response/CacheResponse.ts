//
//
//
//
//
import { NextFunction, Request, Response } from 'express'

import { Cache } from '../server/Cache'
import { ServerResponse } from './ServerResponse'

import { TDataResponseData } from '../types/TDataResponse'
import { Convert } from '../lib/Convert'
import { TDataRequest } from '../types/TDataRequest'
import { RESPONSE_RESULT, RESPONSE_STATUS, RESPONSE_TRANSACTION } from '../lib/Const'
import { Schemas } from '../interpreter/Schemas'
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'


export class CacheResponse {
    static async View(req: Request, res: Response) {
        try {
            const _intResp = await Cache.View()
            ServerResponse.PrepareResponse({
                res,
                intResp: _intResp
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    static async Clean(req: Request, res: Response) {
        try {
            const _intResp = await Cache.Clean()
            ServerResponse.PrepareResponse({
                res,
                intResp: _intResp
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    static async Purge(req: Request, res: Response) {
        try {
            const _intResp = await Cache.Purge()
            ServerResponse.PrepareResponse({
                res,
                intResp: _intResp
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }


    static async Get(req: Request, res: Response, next: NextFunction) {
        try {
            const _dataRequest: TDataRequest = Convert.RequestToDataRequest(req)
            const _schemaConfig = Config.Configuration.schemas[_dataRequest.schema]
            _dataRequest.source = Schemas.GetSource(_schemaConfig, _dataRequest)

            if (!Config.Flags.EnableCache && _dataRequest?.cache) {
                Logger.Warn(`Cache.Get: 'server.cache' is not configured, bypassing option 'cache'`)
                next()
                return
            }

            if (!Config.Flags.EnableCache) {
                next()
                return
            }

            Logger.Debug(`Cache.Get`)
            const _hash = Cache.Hash(_dataRequest)
            const _cacheData = await Cache.Get(_hash)
            if (_cacheData  && Cache.IsValid(_cacheData?.expires)) {
                Logger.Debug(`Cache.Get: cache ${_hash} found`)
                return res.status(200).json(<TDataResponseData>{
                    schema: _cacheData.schema,
                    entity: _cacheData.entity,
                    ...RESPONSE_TRANSACTION.SELECT,
                    ...RESPONSE_RESULT.SUCCESS,
                    ...RESPONSE_STATUS.HTTP_200,
                    cache: "true",
                    expires: _cacheData.expires,
                    data: _cacheData.datatable
                })
            }
            Logger.Debug(`Cache.Get: cache ${_hash} not found`)
            next()

        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }
}