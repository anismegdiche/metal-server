//
//
//
//
//
import { NextFunction, Request, Response } from 'express'
//
import { HTTP_METHOD, HTTP_STATUS_CODE, SERVER } from '../lib/Const'
import { HttpBadRequestError, HttpError, HttpMethodNotAllowedError, HttpNotImplementedError } from '../server/HttpErrors'
import { Server } from '../server/Server'


export class ServerResponse {

    //@Logger.LogFunction()
    static NotImplemented(req: Request, res: Response): void {
        ServerResponse.Error(res, new HttpNotImplementedError())
    }

    //@Logger.LogFunction()
    static BadRequest(res: Response): void {
        ServerResponse.Error(res, new HttpBadRequestError())
    }

    //@Logger.LogFunction()
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

    //@Logger.LogFunction()
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

    //@Logger.LogFunction()
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

    //@Logger.LogFunction()
    static AllowMethods(req: Request, res: Response, next: NextFunction, ...methods: string[]) {
        if (methods.includes(req.method))
            next()
        else
            ServerResponse.Error(res, new HttpMethodNotAllowedError())
    }

    //@Logger.LogFunction()
    static AllowOnlyCrudMethods(req: Request, res: Response, next: NextFunction) {
        ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE)
    }
}