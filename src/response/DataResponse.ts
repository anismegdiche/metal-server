//
//
//
//
//
import { NextFunction, Request, Response } from 'express'

import { Data } from '../server/Data'
import { Convert } from '../lib/Convert'
import { RESPONSE_RESULT, RESPONSE_STATUS, HTTP_STATUS_CODE } from '../lib/Const'
import { Logger } from '../lib/Logger'
import { ServerResponse } from './ServerResponse'


const REQUEST_TRANSACTION: Record<string, string> = {
    GET: 'select',
    POST: 'insert',
    PATCH: 'update',
    DELETE: 'delete'
}

export class DataResponse {
    static async IsSchemaExist(req: Request, res: Response, next: NextFunction) {
        return await Data.IsSchemaExist(req)
            .then((result) => {
                if (!result) {
                    return DataResponse.ReplyNotFound(req, res, `schema '${req.params.schema}' not found in schemas`)
                }
                next()
            })
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static ReplyNotFound(req: Request, res: Response, message: string): Response {
        Logger.Debug(`${Logger.In} not found in '${req.params.entity}'`)
        return res
            .status(HTTP_STATUS_CODE.NOT_FOUND)
            .json({
                transaction: REQUEST_TRANSACTION[req.method],
                ...RESPONSE_RESULT.NOT_FOUND,
                ...RESPONSE_STATUS.HTTP_404,
                message
            })
    }

    static async Select(req: Request, res: Response) {
        return await Data.Select(req)
            .then(dres => Convert.DataResponseToResponse(dres, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static async Delete(req: Request, res: Response) {
        return await Data.Delete(req)
            .then(dres => Convert.DataResponseToResponse(dres, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static async Update(req: Request, res: Response) {
        return await Data.Update(req)
            .then(dres => Convert.DataResponseToResponse(dres, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static async Insert(req: Request, res: Response) {
        return await Data.Insert(req)
            .then(dres => Convert.DataResponseToResponse(dres, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }
}