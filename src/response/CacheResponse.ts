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

    //XXX static async Get(req: Request, res: Response, next: NextFunction): Promise<void> {

    //XXX     ServerResponse.CheckRequest(req)
    //XXX     const schemaRequest: TSchemaRequest = Convert.RequestToSchemaRequest(req)

    //XXX     Cache.Get(schemaRequest, req.__METAL_CURRENT_USER)
    //XXX         .then(intRes => ServerResponse.Response(res, intRes))
    //XXX         .catch((error: HttpError) => {
    //XXX             HttpErrorLog(error)
    //XXX             next()
    //XXX         })
    //XXX }
}