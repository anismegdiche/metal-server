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
import { TJson } from '../types/TJson'


export class CacheResponse {
    static View(req: Request, res: Response): void {
        Cache.View()
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: unknown) => ServerResponse.Error(res, error as Error))

    }

    static Clean(req: Request, res: Response): void {
        Cache.Clean()
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: unknown) => ServerResponse.Error(res, error as Error))
    }

    static Purge(req: Request, res: Response): void {
        Cache.Purge()
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: unknown) => ServerResponse.Error(res, error as Error))
    }

    static Get(req: Request, res: Response, next: NextFunction): void {
        try {
            const schemaRequest: TSchemaRequest = Convert.RequestToSchemaRequest(req)
            const { schemaName, entityName } = schemaRequest
            const schemaConfig: TJson = Config.Get(`schemas.${schemaRequest.schemaName}`)
            schemaRequest.sourceName = Schema.GetRoute(schemaName, entityName, schemaConfig).routeName

            if (!Config.Flags.EnableCache && schemaRequest?.cache === undefined) {
                Logger.Warn(`Cache.Get: 'server.cache' is not configured, bypassing option 'cache'`)
                next()
                return
            }

            if (!Config.Flags.EnableCache) {
                next()
                return
            }

            Logger.Debug(`Cache.Get`)
            const _hash = Cache.Hash(schemaRequest)

            Cache.Get(_hash)
                .then(_cacheData => {
                    if (_cacheData && Cache.IsValid(_cacheData?.expires)) {
                        Logger.Debug(`Cache.Get: cache ${_hash} found`)
                        res.status(200).json(<TSchemaResponseData>{
                            schemaName: _cacheData.schemaName,
                            entityName: _cacheData.entityName,
                            ...RESPONSE_TRANSACTION.SELECT,
                            ...RESPONSE_RESULT.SUCCESS,
                            ...RESPONSE_STATUS.HTTP_200,
                            cache: "true",
                            expires: _cacheData.expires,
                            data: _cacheData.datatable
                        })
                    } else {
                        Logger.Debug(`Cache.Get: cache ${_hash} not found`)
                        next()
                    }
                })
                .catch((error: unknown) => {
                    ServerResponse.Error(res, error as Error)
                })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }
}