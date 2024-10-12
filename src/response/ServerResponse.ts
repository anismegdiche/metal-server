//
//
//
//
//
import { Request, Response } from 'express'
//
import { HTTP_STATUS_CODE } from '../lib/Const'
import { HttpErrorBadRequest, HttpError, HttpErrorNotImplemented } from '../server/HttpErrors'
import { Server } from '../server/Server'
import { TJson } from "../types/TJson"


export class ServerResponse {

    //@Logger.LogFunction()
    //TODO use internal response and httpResponse
    static GetInfo(req: Request, res: Response): void {
        ServerResponse.Response(res, Server.GetInfo())
    }

    //@Logger.LogFunction()
    //TODO use internal response and httpResponse
    static async Reload(req: Request, res: Response): Promise<void> {
        ServerResponse.Response(res, await Server.Reload())
    }

    //@Logger.LogFunction()
    static Response(res: Response, body: TJson, status: HTTP_STATUS_CODE = HTTP_STATUS_CODE.OK): void {
        try {
            res.status(status).json(body).end()
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }

    //@Logger.LogFunction()
    static ResponseError(res: Response, error: HttpError | Error) {
        const status = (error instanceof HttpError)
            ? error.Status
            : HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR

        res
            .status(status)
            .json({
                message: 'Something Went Wrong',
                error: error.message,
                stack: (status == HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
                    ? (error?.stack?.split('\n') ?? "")
                    : undefined
            })
            .end()
    }

    //@Logger.LogFunction()
    static ResponseNotImplemented(req: Request, res: Response): void {
        ServerResponse.ResponseError(res, new HttpErrorNotImplemented())
    }

    //@Logger.LogFunction()
    static ResponseBadRequest(res: Response): void {
        ServerResponse.ResponseError(res, new HttpErrorBadRequest())
    }
}