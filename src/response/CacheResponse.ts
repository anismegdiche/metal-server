//
//
//
//
//
import { NextFunction, Request, Response } from 'express'
//
import { Cache } from '../server/Cache'
import { ServerResponse } from './ServerResponse'
import { Convert } from '../lib/Convert'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { HttpError, HttpErrorLog } from '../server/HttpErrors'


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

    static async Get(req: Request, res: Response, next: NextFunction): Promise<void> {

        ServerResponse.CheckRequest(req)
        const schemaRequest: TSchemaRequest = Convert.RequestToSchemaRequest(req)

        Cache.Get(schemaRequest, req.__METAL_CURRENT_USER)
            .then(intRes => ServerResponse.Response(res, intRes))
            .catch((error: HttpError) => {
                HttpErrorLog(error)
                next()
            })
    }
}