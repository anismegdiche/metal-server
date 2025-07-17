//
//
//
import { Request, Response } from 'express'
//
import { Convert } from '../../../utils/Convert'
import { Cache } from '../../cache/Cache'
import { HttpError } from '../../errors/HttpErrors'
import { RequestHandler } from '../RequestHandler'
import { ResponseHandler } from '../ResponseHandler'

//
export class CacheResponse {
    static View(req: Request, res: Response): void {
        RequestHandler.CheckRequest(req)
        Cache.View(req.__METAL_CURRENT_USER)
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }

    static Clean(req: Request, res: Response): void {
        RequestHandler.CheckRequest(req)
        Cache.Clean(req.__METAL_CURRENT_USER)
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }

    static Purge(req: Request, res: Response): void {
        RequestHandler.CheckRequest(req)
        Cache.Purge(req.__METAL_CURRENT_USER)
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }
}
