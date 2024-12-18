//
//
//
//
//
import { Request, Response } from 'express'
import typia from "typia"
//
import { HTTP_STATUS_CODE } from '../lib/Const'
import { HttpErrorBadRequest, HttpError, HttpErrorNotImplemented, HttpErrorUnauthorized, HttpErrorInternalServerError } from '../server/HttpErrors'
import { Server } from '../server/Server'
import { TJson } from "../types/TJson"
import { Convert } from "../lib/Convert"


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

    static Response(res: Response, body: TJson, status: HTTP_STATUS_CODE = HTTP_STATUS_CODE.OK): void {
        try {
            res.status(status).json(body).end()
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }

    static ResponseError(res: Response, error: HttpError | Error) {
        const status = typia.is<HttpError>(error)
            ? error.Status
            : HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR

        res
            .status(status)
            .json({
                // message: 'Something Went Wrong',
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