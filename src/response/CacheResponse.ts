//
//
//
//
//
import { NextFunction, Request, Response } from 'express'

import { Cache } from '../server/Cache'
import { ServerResponse } from './ServerResponse'

import { TSchemaResponseData } from '../types/TSchemaResponse'
import { Convert } from '../lib/Convert'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { RESPONSE_RESULT, RESPONSE_STATUS, RESPONSE_TRANSACTION } from '../lib/Const'
import { Schema } from '../server/Schema'
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'


export class CacheResponse {
    static async View(req: Request, res: Response) {
        try {
            const _intRes = await Cache.View()
            ServerResponse.PrepareResponse({
                res,
                intRes: _intRes
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    static async Clean(req: Request, res: Response) {
        try {
            const _intRes = await Cache.Clean()
            ServerResponse.PrepareResponse({
                res,
                intRes: _intRes
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    static async Purge(req: Request, res: Response) {
        try {
            const _intRes = await Cache.Purge()
            ServerResponse.PrepareResponse({
                res,
                intRes: _intRes
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }


    static async Get(req: Request, res: Response, next: NextFunction) {
        try {
            const _schemaRequest: TSchemaRequest = Convert.RequestToSchemaRequest(req)
            const _schemaConfig = Config.Configuration.schemas[_schemaRequest.schema]
            _schemaRequest.source = Schema.GetSource(_schemaConfig, _schemaRequest)

            if (!Config.Flags.EnableCache && _schemaRequest?.cache) {
                Logger.Warn(`Cache.Get: 'server.cache' is not configured, bypassing option 'cache'`)
                next()
                return
            }

            if (!Config.Flags.EnableCache) {
                next()
                return
            }

            Logger.Debug(`Cache.Get`)
            const _hash = Cache.Hash(_schemaRequest)
            const _cacheData = await Cache.Get(_hash)
            if (_cacheData  && Cache.IsValid(_cacheData?.expires)) {
                Logger.Debug(`Cache.Get: cache ${_hash} found`)
                return res.status(200).json(<TSchemaResponseData>{
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