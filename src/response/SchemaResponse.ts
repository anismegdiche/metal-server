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
import { RESPONSE_RESULT, RESPONSE_STATUS, HTTP_STATUS_CODE, VALIDATION_ERROR_MESSAGE } from '../lib/Const'
import { Logger } from '../lib/Logger'
import { ServerResponse } from './ServerResponse'
import { Schema } from '../server/Schema'
import { BadRequestError, ContentTooLargeError, HttpError } from '../server/HttpErrors'
import { Config } from '../server/Config'
import { JsonHelper } from '../lib/JsonHelper'


const REQUEST_TRANSACTION: Record<string, string> = {
    GET: 'select',
    POST: 'insert',
    PATCH: 'update',
    DELETE: 'delete'
}

export class SchemaResponse {

    static readonly ParameterValidation = checkSchema({
        schemaName: {
            in: ['params'],
            trim: true,
            isString: true,
            errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
        },
        entityName: {
            in: ['params'],
            trim: true,
            isString: true,
            errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
        },
        filter: {
            in: ['body', 'query'],
            trim: true,
            optional: true,
            custom: {
                options: (value, { req }) => {
                    if (req.method === 'GET' && typeof value === 'string') {
                        try {
                            JSON.parse(value)
                            return true
                         
                        } catch (error) {
                            return false
                        }
                    }
                    return true
                }
            },
            errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_JSON,
            customSanitizer: {
                options: (value) => {
                    if (typeof value === 'string') {
                        try {
                            return JSON.parse(value)
                         
                        } catch (error) {
                            return value
                        }
                    }
                    return value
                }
            }
        },
        filterExpression: {
            in: ['body', 'query'],
            trim: true,
            optional: true,
            isString: true,
            errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
        },
        fields: {
            in: ['body', 'query'],
            trim: true,
            optional: true,
            isString: true,
            errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
        },
        sort: {
            in: ['body', 'query'],
            trim: true,
            optional: true,
            isString: true,
            errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
        },
        cache: {
            in: ['body', 'query'],
            trim: true,
            optional: true,
            isNumeric: true,
            errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_NUMBER,
            customSanitizer: {
                options: (value) => {
                    if (typeof value === 'string') {
                        const parsedValue = parseFloat(value)
                        if (!isNaN(parsedValue)) {
                            return parsedValue
                        }
                    }
                    return value
                }
            }
        },
        data: {
            in: ['body'],
            optional: true,
            custom: {
                options: (value) => {
                    return (_.isObject(value) || Array.isArray(value))
                }
            },
            errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_JSON_ARRAY_OR_OBJECT
        }
    })

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
            ServerResponse.Error(res, new BadRequestError(errorMessages.join(', ')))
        }

    }

    static Select(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Select(schemaRequest)
            .then(schRes => {
                const _resSize = JsonHelper.Size(schRes)
                //TODO: check how to remove casting
                const _responseLimit = Config.Flags.ResponseLimit as number
                // file deepcode ignore NoEffectExpression: debugging pupose
                Logger.Debug(`${Logger.Out} SchemaResponse.Select: response size = ${_resSize} bytes`)
                if (_resSize > _responseLimit)
                    throw new ContentTooLargeError("Response body too large")
                return Convert.SchemaResponseToResponse(schRes, res)
            })
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }

    static Delete(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Delete(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }

    static Update(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Update(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.Error(res, error))
    }

    static Insert(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Insert(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.Error(res, error))
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