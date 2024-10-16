//
//
//
//
//
import { Request, Response } from 'express'
//
import { Convert } from '../lib/Convert'
import { Logger } from '../utils/Logger'
import { ServerResponse } from './ServerResponse'
import { Schema } from '../server/Schema'
import { HttpErrorContentTooLarge, HttpError } from '../server/HttpErrors'
import { Config } from '../server/Config'
import { JsonHelper } from '../lib/JsonHelper'

export class SchemaResponse {

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
                    throw new HttpErrorContentTooLarge("Response body too large")
                return Convert.SchemaResponseToResponse(schRes, res)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    //@Logger.LogFunction()
    static Delete(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Delete(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    //@Logger.LogFunction()
    static Update(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Update(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    //@Logger.LogFunction()
    static Insert(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Insert(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    //@Logger.LogFunction()
    static ListEntities(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.ListEntities(schemaRequest)
            .then(schRes => Convert.SchemaResponseToResponse(schRes, res))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }
}