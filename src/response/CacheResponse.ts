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
import { Logger } from '../utils/Logger'
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

    // CURRENT refactor to be compliant with response/class architecture logic
    static async Get(req: Request, res: Response, next: NextFunction): Promise<void> {

        ServerResponse.CheckRequest(req)
        const schemaRequest: TSchemaRequest = Convert.RequestToSchemaRequest(req)

        await Cache.Get(schemaRequest, req.__METAL_CURRENT_USER)
            .then((intRes) => {
                if (!intRes.Body)
                    next()

                const _cacheData = intRes.Body!.data.Rows.at(0) as TCacheData

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
                Logger.Error(error)
                next()
            })
    }
}