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
import { RESPONSE, RESPONSE_TRANSACTION } from '../lib/Const'
import { Schema } from '../server/Schema'
import { Logger } from '../utils/Logger'
import { Config } from '../server/Config'
import { TJson } from '../types/TJson'
import { TCacheData } from '../types/TCacheData'
import { HttpError } from '../server/HttpErrors'


export class CacheResponse {
    //@Logger.LogFunction()
    static View(req: Request, res: Response): void {
        Cache.View()
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.Error(res, error))

    }

    //@Logger.LogFunction()
    static Clean(req: Request, res: Response): void {
        Cache.Clean()
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }

    //@Logger.LogFunction()
    static Purge(req: Request, res: Response): void {
        Cache.Purge()
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }

    // TODO: refactor to be compliant with architecture logic
    //@Logger.LogFunction()
    static Get(req: Request, res: Response, next: NextFunction): void {
        try {
            const schemaRequest: TSchemaRequest = Convert.RequestToSchemaRequest(req)
            const { schemaName, entityName } = schemaRequest
            const schemaConfig: TJson = Config.Get(`schemas.${schemaRequest.schemaName}`)
            schemaRequest.sourceName = Schema.GetRoute(schemaName, entityName, schemaConfig).routeName

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
                    if (_cacheData && Cache.IsValid(_cacheData?.expires)) {
                        Convert.SchemaResponseToResponse(
                            <TSchemaResponseData>{
                                schemaName: _cacheData.schemaRequest.schemaName,
                                entityName: _cacheData.schemaRequest.entityName,
                                ...RESPONSE_TRANSACTION.SELECT,
                                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                                ...RESPONSE.SELECT.SUCCESS.STATUS,
                                cache: "true",
                                expires: _cacheData.expires,
                                data: _cacheData.datatable
                            },
                            res
                        )
                    } else {
                        next()
                    }
                })
                .catch((error: Error) => {
                    ServerResponse.Error(res, error)
                })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }
}