//
//
//
//
//
import { NextFunction, Request, Response } from 'express'

import { Cache } from '../server/Cache'
import { ServerResponse } from './ServerResponse'

import { TSchemaResponse } from '../types/TSchemaResponse'
import { Convert } from '../lib/Convert'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { RESPONSE } from '../lib/Const'
import { Schema } from '../server/Schema'
import { Logger } from '../utils/Logger'
import { Config } from '../server/Config'
import { TJson } from '../types/TJson'
import { TCacheData } from '../types/TCacheData'
import { HttpError } from '../server/HttpErrors'


export class CacheResponse {
    static View(req: Request, res: Response): void {
        ServerResponse.CheckRequest(req)
        Cache.View(req.__METAL_CURRENT_USER)
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))

    }

    static Clean(req: Request, res: Response): void {
        ServerResponse.CheckRequest(req)
        Cache.Clean(req.__METAL_CURRENT_USER)
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static Purge(req: Request, res: Response): void {
        ServerResponse.CheckRequest(req)
        Cache.Purge(req.__METAL_CURRENT_USER)
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    // TODO refactor to be compliant with response/class architecture logic
    static Get(req: Request, res: Response, next: NextFunction): void {
        ServerResponse.CheckRequest(req)
        try {
            const schemaRequest: TSchemaRequest = Convert.RequestToSchemaRequest(req)
            const { schema, entity } = schemaRequest
            const schemaConfig: TJson = Config.Get(`schemas.${schemaRequest.schema}`)
            schemaRequest.source = Schema.GetRoute(schema, entity, schemaConfig).routeName

            if (!Config.Flags.EnableCache && schemaRequest?.cache) {
                Logger.Warn(`Cache.Get: 'server.cache' is not configured, bypassing option 'cache'`)
                next()
                return
            }

            if (!Config.Flags.EnableCache) {
                next()
                return
            }

            const cacheHash = Cache.Hash(schemaRequest)

            Cache.Get(cacheHash)
                .then((_cacheData: TCacheData | undefined) => {
                    if (_cacheData && Cache.IsCacheValid(_cacheData?.expires)) {
                        Convert.SchemaResponseToResponse(
                            <TSchemaResponse>{
                                schema: _cacheData.schemaRequest.schema,
                                entity: _cacheData.schemaRequest.entity,
                                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                                ...RESPONSE.SELECT.SUCCESS.STATUS,
                                data: _cacheData.data
                            },
                            res
                        )
                    } else {
                        next()
                    }
                })
                .catch((error: Error) => {
                    ServerResponse.ResponseError(res, error)
                })
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }
}