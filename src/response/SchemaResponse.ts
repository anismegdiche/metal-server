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
import { HttpErrorContentTooLarge, HttpError, HttpErrorInternalServerError } from '../server/HttpErrors'
import { Config } from '../server/Config'
import { JsonHelper } from '../lib/JsonHelper'
import { HTTP_STATUS_CODE } from "../lib/Const"

export class SchemaResponse {

    static Select(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Select(schemaRequest)
            .then(intRes => {
                if (!intRes.Body)
                    throw new HttpErrorInternalServerError()

                const _schemaResponse = intRes.Body
                const _resSize = JsonHelper.Size(_schemaResponse)
                //TODO: check how to remove casting
                const _resLimit = Config.Flags.ResponseLimit as number
                // file deepcode ignore NoEffectExpression: debugging pupose
                Logger.Debug(`${Logger.Out} SchemaResponse.Select: response size = ${_resSize} bytes`)
                if (_resSize > _resLimit)
                    throw new HttpErrorContentTooLarge("Response body too large")

                return Convert.SchemaResponseToResponse(_schemaResponse, res)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static Delete(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Delete(schemaRequest)
            .then(intRes => {
                if (intRes.StatusCode !== HTTP_STATUS_CODE.NO_CONTENT)
                    throw new HttpErrorInternalServerError()
                return Convert.InternalResponseToResponse(res, intRes)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static Update(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Update(schemaRequest)
            .then(intRes => {
                if (intRes.StatusCode !== HTTP_STATUS_CODE.NO_CONTENT)
                    throw new HttpErrorInternalServerError()
                return Convert.InternalResponseToResponse(res, intRes)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static Insert(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.Insert(schemaRequest)
            .then(intRes => {
                if (intRes.StatusCode !== HTTP_STATUS_CODE.CREATED)
                    throw new HttpErrorInternalServerError()
                return Convert.InternalResponseToResponse(res, intRes)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static ListEntities(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        Schema.ListEntities(schemaRequest)
            .then(intRes => {
                if (!intRes.Body)
                    throw new HttpErrorInternalServerError()

                const _schemaResponse = intRes.Body
                return Convert.SchemaResponseToResponse(_schemaResponse, res)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }
}