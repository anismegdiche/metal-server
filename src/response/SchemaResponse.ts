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
    static IsExist(req: Request, res: Response, next: NextFunction): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.IsExist(schemaRequest)
            .then((isExist) => {
                if (!isExist) {
                    SchemaResponse.ReplyNotFound(req, res, `schema '${req.params.schemaName}' not found in schemas`)
                    return
                }
                next()
            })
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static Select(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Select(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static Delete(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Delete(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static Update(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Update(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static Insert(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Insert(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: Error) => ServerResponse.Error(res, error))
    }

    static ReplyNotFound(req: Request, res: Response, message: string): void {
        Logger.Debug(`${Logger.Out} ${message}`)
        res
            .status(HTTP_STATUS_CODE.NOT_FOUND)
            .json({
                transaction: REQUEST_TRANSACTION[req.method],
                ...RESPONSE_RESULT.NOT_FOUND,
                ...RESPONSE_STATUS.HTTP_404,
                message
            })
            .end()
    }
}