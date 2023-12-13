//
//
//
//
//
import { NextFunction, Request, Response } from 'express'

import { Convert } from '../lib/Convert'
import { RESPONSE_RESULT, RESPONSE_STATUS, HTTP_STATUS_CODE } from '../lib/Const'
import { Logger } from '../lib/Logger'
import { ServerResponse } from './ServerResponse'
import { Schema } from '../server/Schema'


const REQUEST_TRANSACTION: Record<string, string> = {
    GET: 'select',
    POST: 'insert',
    PATCH: 'update',
    DELETE: 'delete'
}

export class SchemaResponse {
    static async IsExist(req: Request, res: Response, next: NextFunction) {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        return await Schema.IsExist(schemaRequest)
            .then((result) => {
                if (!result) {
                    return SchemaResponse.ReplyNotFound(req, res, `schema '${req.params.schema}' not found in schemas`)
                }
                next()
            })
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static async Select(req: Request, res: Response) {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        return await Schema.Select(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static async Delete(req: Request, res: Response) {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        return await Schema.Delete(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static async Update(req: Request, res: Response) {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        return await Schema.Update(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static async Insert(req: Request, res: Response) {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        return await Schema.Insert(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
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
}