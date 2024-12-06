//
//
//
//
//
import { Request, Response } from 'express'
//
import { Convert } from '../lib/Convert'
import { ServerResponse } from './ServerResponse'
import { Schema } from '../server/Schema'
import { HttpError, HttpErrorInternalServerError } from '../server/HttpErrors'
import { HTTP_STATUS_CODE } from "../lib/Const"

export class SchemaResponse {

    static Select(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        ServerResponse.CheckRequest(req)
        
        Schema.Select(schemaRequest,req.__METAL_CURRENT_USER)
            .then(intRes => ServerResponse.Response(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static Delete(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        ServerResponse.CheckRequest(req)
        
        Schema.Delete(schemaRequest,req.__METAL_CURRENT_USER)
            .then(intRes => {
                if (intRes.StatusCode !== HTTP_STATUS_CODE.NO_CONTENT)
                    throw new HttpErrorInternalServerError()
                return Convert.InternalResponseToResponse(res, intRes)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static Update(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        ServerResponse.CheckRequest(req)
        
        Schema.Update(schemaRequest,req.__METAL_CURRENT_USER)
            .then(intRes => {
                if (intRes.StatusCode !== HTTP_STATUS_CODE.NO_CONTENT)
                    throw new HttpErrorInternalServerError()
                return Convert.InternalResponseToResponse(res, intRes)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static Insert(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        ServerResponse.CheckRequest(req)
        
        Schema.Insert(schemaRequest,req.__METAL_CURRENT_USER)
            .then(intRes => {
                if (intRes.StatusCode !== HTTP_STATUS_CODE.CREATED)
                    throw new HttpErrorInternalServerError()
                return Convert.InternalResponseToResponse(res, intRes)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static ListEntities(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        ServerResponse.CheckRequest(req)
        
        Schema.ListEntities(schemaRequest,req.__METAL_CURRENT_USER)
            .then(intRes => {
                if (!intRes.Body)
                    throw new HttpErrorInternalServerError()

                const _schemaResponse = intRes.Body
                return Convert.SchemaResponseToResponse(_schemaResponse, res)
            })
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }
}