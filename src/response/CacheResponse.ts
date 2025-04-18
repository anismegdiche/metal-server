//
//
//
//
//
import { Request, Response } from 'express'
//
import { Cache } from '../server/Cache'
import { ServerResponse } from './ServerResponse'
import { Convert } from '../lib/Convert'
import { HttpError } from '../server/HttpErrors'


//
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
}