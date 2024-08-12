//
//
//
//
//
import { NextFunction, Request, Response } from 'express'
//
import { HTTP_STATUS_CODE, SERVER } from '../lib/Const'
import { Server } from '../server/Server'
import { HttpBadRequestError, HttpError, HttpMethodNotAllowedError, HttpNotImplementedError } from '../server/HttpErrors'


export class ServerResponse {

    static NotImplemented(req: Request, res: Response): void {
        ServerResponse.Error(res, new HttpNotImplementedError())
    }

    static BadRequest(res: Response): void {
        ServerResponse.Error(res, new HttpBadRequestError())
    }

    static Error(res: Response, error: HttpError | Error) {
        const status = (error instanceof HttpError)
            ? error.status
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

    static GetInfo(req: Request, res: Response): void {
        try {
            res
                .status(HTTP_STATUS_CODE.OK)
                .json(Server.GetInfo())
                .end()
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    static Reload(req: Request, res: Response): void {
        try {
            Server.Reload()
            res
                .status(HTTP_STATUS_CODE.OK)
                .json({
                    server: SERVER.NAME,
                    message: `Server reloaded`
                })
                .end()

        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    static AllowMethods(req: Request, res: Response, next: NextFunction, ...methods: string[]) {
        if (methods.includes(req.method))
            next()
        else
            ServerResponse.Error(res, new HttpMethodNotAllowedError())
    }
}