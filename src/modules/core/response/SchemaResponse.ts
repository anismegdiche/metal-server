//
//
//
import type { Request, Response } from 'express'
//
import { Convert } from '../../../utils/Convert'
import { HttpError, HttpErrorInternalServerError } from '../../errors/HttpErrors'
import { Schema } from '../../schema/Schema'
import type { TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../schema/types/TSchemaRequest'
import { HTTP_STATUS_CODE } from '../@consts'
import { RequestHandler } from '../RequestHandler'
import { ResponseHandler } from '../ResponseHandler'

export class SchemaResponse {
    static Select(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        RequestHandler.CheckRequest(req)

        Schema.Select(schemaRequest as TSchemaRequestSelect, req.__METAL_CURRENT_USER)
            .then(intRes => ResponseHandler.Response(res, intRes))
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }

    static Delete(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        RequestHandler.CheckRequest(req)

        Schema.Delete(schemaRequest as TSchemaRequestDelete, req.__METAL_CURRENT_USER)
            .then(intRes => {
                if (intRes.StatusCode !== HTTP_STATUS_CODE.NO_CONTENT) {
                    throw new HttpErrorInternalServerError()
                }
                return Convert.InternalResponseToResponse(res, intRes)
            })
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }

    static Update(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        RequestHandler.CheckRequest(req)

        Schema.Update(schemaRequest as TSchemaRequestUpdate, req.__METAL_CURRENT_USER)
            .then(intRes => {
                if (intRes.StatusCode !== HTTP_STATUS_CODE.NO_CONTENT) {
                    throw new HttpErrorInternalServerError()
                }
                return Convert.InternalResponseToResponse(res, intRes)
            })
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }

    static Insert(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        RequestHandler.CheckRequest(req)

        Schema.Insert(schemaRequest as TSchemaRequestInsert, req.__METAL_CURRENT_USER)
            .then(intRes => {
                if (intRes.StatusCode !== HTTP_STATUS_CODE.CREATED) {
                    throw new HttpErrorInternalServerError()
                }
                return Convert.InternalResponseToResponse(res, intRes)
            })
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }

    static ListEntities(req: Request, res: Response): void {
        const schemaRequest = Convert.RequestToSchemaRequest(req)
        RequestHandler.CheckRequest(req)

        Schema.ListEntities(schemaRequest, req.__METAL_CURRENT_USER)
            .then(intRes => {
                if (!intRes.Body) {
                    throw new HttpErrorInternalServerError()
                }

                const _schemaResponse = intRes.Body
                return ResponseHandler.FromSchemaResponse(_schemaResponse, res)
            })
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }
}
