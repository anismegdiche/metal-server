//
//
//
//
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Request, Response, NextFunction } from 'express'

import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from '../lib/Const'
import { User } from '../server/User'
import { Config } from '../server/Config'
import { ServerResponse } from '../response/ServerResponse'


export class UserResponse {

    static #GetRequestToken(req: Request): string | undefined {
        return req.headers.authorization?.replace('Bearer ', '')
    }

    public static LogIn(req: Request, res: Response) {
        try {
            const { username, password } = req.body
            const _intResp = User.LogIn(username.toString(), password.toString())
            ServerResponse.PrepareResponse({
                res,
                intResp: _intResp
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    public static LogOut(req: Request, res: Response) {
        try {
            const _token = UserResponse.#GetRequestToken(req)
            const _intResp = User.LogOut(_token)
            ServerResponse.PrepareResponse({
                res,
                intResp: _intResp
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    public static GetInfo(req: Request, res: Response) {
        try {
            const token = UserResponse.#GetRequestToken(req)
            const _intResp = User.GetInfo(token)
            ServerResponse.PrepareResponse({
                res,
                intResp: _intResp
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    public static IsAuthenticated(req: Request, res: Response, next: NextFunction) {
        if (!Config.Flags.EnableAuthentication) {
            return next()
        }

        const token = UserResponse.#GetRequestToken(req)
        if (User.IsAuthenticated(token)) {
            return next()
        }

        res.status(HTTP_STATUS_CODE.FORBIDDEN).json({
            message: HTTP_STATUS_MESSAGE.FORBIDDEN
        })
    }

    public static IsNotAuthenticated(req: Request, res: Response, next: NextFunction) {
        if (!Config.Flags.EnableAuthentication) {
            return next()
        }

        const token = UserResponse.#GetRequestToken(req)
        if (User.IsAuthenticated(token)) {
            return res.status(HTTP_STATUS_CODE.FORBIDDEN).json({ message: "User already logged" })
        }
        next()
    }
}