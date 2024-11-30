//
//
//
//
//
import { Request, Response } from 'express'
import typia from "typia"
//
import { HTTP_STATUS_CODE } from '../lib/Const'
import { HttpErrorBadRequest, HttpError, HttpErrorNotImplemented, HttpErrorUnauthorized, HttpErrorInternalServerError, HttpErrorLog, HttpErrorContentTooLarge } from '../server/HttpErrors'
import { Server } from '../server/Server'
import { TJson } from "../types/TJson"
import { Convert } from "../lib/Convert"
import { TInternalResponse } from "../types/TInternalResponse"
import { TSchemaResponse } from "../types/TSchemaResponse"
import { JsonHelper } from "../lib/JsonHelper"
import { Config } from "../server/Config"
import { Logger } from "../utils/Logger"


//
export class ServerResponse {

    static async GetInfo(req: Request, res: Response): Promise<void> {
        Server.GetInfo()
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static async Reload(req: Request, res: Response): Promise<void> {
        ServerResponse.CheckRequest(req)
        Server.Reload(req.__METAL_CURRENT_USER)
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))

    }

    static Response(res: Response, intRes: TInternalResponse<TSchemaResponse | undefined>): Response {
        if (!intRes.Body)
            throw new HttpErrorInternalServerError()

        const _schemaResponse = intRes.Body
        const _resSize = JsonHelper.Size(_schemaResponse)
        //TODO check how to remove casting
        const _resLimit = Config.Flags.ResponseLimit as number
        // file deepcode ignore NoEffectExpression: debugging pupose
        Logger.Debug(`${Logger.Out} SchemaResponse.Select: response size = ${_resSize} bytes`)
        if (_resSize > _resLimit)
            throw new HttpErrorContentTooLarge("Response body too large")

        return Convert.SchemaResponseToResponse(_schemaResponse, res)
    }

    static ResponseError(res: Response, error: HttpError | Error) {
        const status = typia.is<HttpError>(error)
            ? error.Status
            : HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR

        HttpErrorLog(error)
        res
            .status(status)
            .json({
                error: error.message,
                stack: (status == HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
                    ? (error?.stack?.split('\n') ?? "")
                    : undefined
            })
            .end()
    }

    static ResponseNotImplemented(req: Request, res: Response): void {
        ServerResponse.ResponseError(res, new HttpErrorNotImplemented())
    }

    static ResponseBadRequest(res: Response): void {
        ServerResponse.ResponseError(res, new HttpErrorBadRequest())
    }

    static CheckRequest(req: Request) {
        try {
            if (!req.__METAL_CURRENT_USER)
                throw new HttpErrorUnauthorized()
        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }
}