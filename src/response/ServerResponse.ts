//
//
//
//
//
import _ from 'lodash'
import { NextFunction, Request, Response } from 'express'

import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE, SERVER } from '../lib/Const'
import { Server } from '../server/Server'


export class ServerResponse {

    public static NotImplemented(req: Request, res: Response): void {
        res
            .status(HTTP_STATUS_CODE.NOT_IMPLEMENTED)
            .json({ message: HTTP_STATUS_MESSAGE.NOT_IMPLEMENTED })
            .end()
    }

    public static BadRequest(res: Response): void {
        res
            .status(HTTP_STATUS_CODE.BAD_REQUEST)
            .json({ message: HTTP_STATUS_MESSAGE.BAD_REQUEST })
            .end()
    }

    static Error(res: Response, error: Error) {
        res
            .status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
            .json({
                message: 'Something Went Wrong',
                error: error.message,
                stack: _.split(error.stack, '\n')
            })
            .end()
    }

    public static GetInfo(req: Request, res: Response): void {
        try {
            res
                .status(HTTP_STATUS_CODE.OK)
                .json(Server.GetInfo())
                .end()
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    public static Reload(req: Request, res: Response): void {
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

    public static AllowMethods(req: Request, res: Response, next: NextFunction, ...methods: string[]) {

        if (methods.includes(req.method)) {
            next()
        } else {
            res
                .status(HTTP_STATUS_CODE.METHOD_NOT_ALLOWED)
                .json({ error: HTTP_STATUS_MESSAGE.METHOD_NOT_ALLOWED })
                .end()
        }
    }
}