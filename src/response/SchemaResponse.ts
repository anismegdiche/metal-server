//
//
//
//
//
import { NextFunction, Request, Response } from 'express'
import { checkSchema, validationResult } from 'express-validator'
import _ from 'lodash'
//
import { Convert } from '../lib/Convert'
import { RESPONSE_RESULT, RESPONSE_STATUS, HTTP_STATUS_CODE } from '../lib/Const'
import { Logger } from '../utils/Logger'
import { ServerResponse } from './ServerResponse'
import { Schema } from '../server/Schema'
import { HttpBadRequestError, HttpContentTooLargeError, HttpError } from '../server/HttpErrors'
import { Config } from '../server/Config'
import { JsonHelper } from '../lib/JsonHelper'
import { EntityParamsSchema } from "../schemas/EntityParams.schema"


const REQUEST_TRANSACTION: Record<string, string> = {
    GET: 'select',
    POST: 'insert',
    PATCH: 'update',
    DELETE: 'delete'
}

export class SchemaResponse {

    static readonly ParameterValidation = checkSchema(EntityParamsSchema)

    //@Logger.LogFunction()
    static CheckParameters(req: Request, res: Response, next: NextFunction): void {
        // Check for validation errors
        const errors = validationResult(req)

        if (errors.isEmpty()) {
            const schemaRequest = Convert.RequestToSchemaRequest(req)
            Schema.IsExists(schemaRequest)
                .then(next)
                .catch((error: HttpError) => ServerResponse.Error(res, error))
        } else {
            const errorMessages = _.map(
                errors.array(),
                (item: any) => `${item.path}: ${item.msg} in ${item.location}`
            )
            ServerResponse.Error(res, new HttpBadRequestError(errorMessages.join(', ')))
        }

    }

    //@Logger.LogFunction()
    static ReplyNotFound(req: Request, res: Response, message: string): void {
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

    //@Logger.LogFunction()
    static Select(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Select(schemaRequest)
            .then(schRes => {
                const _resSize = JsonHelper.Size(schRes)
                //TODO: check how to remove casting
                const _resLimit = Config.Flags.ResponseLimit as number
                // file deepcode ignore NoEffectExpression: debugging pupose
                Logger.Debug(`${Logger.Out} SchemaResponse.Select: response size = ${_resSize} bytes`)
                if (_resSize > _resLimit)
                    throw new HttpContentTooLargeError("Response body too large")
                return Convert.SchemaResponseToResponse(schRes, res)
            })
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }

    //@Logger.LogFunction()
    static Delete(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Delete(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }

    //@Logger.LogFunction()
    static Update(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Update(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }

    //@Logger.LogFunction()
    static Insert(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Insert(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }

    //@Logger.LogFunction()
    static ListEntities(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.ListEntities(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }
}