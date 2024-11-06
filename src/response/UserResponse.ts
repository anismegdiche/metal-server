//
//
//
//
//
import { Request, Response, NextFunction } from 'express'
//
import { User } from '../server/User'
import { ServerResponse } from '../response/ServerResponse'
import { Convert } from '../lib/Convert'
import { HttpErrorUnauthorized, HttpErrorForbidden } from "../server/HttpErrors"
import { TUserCredentials } from "../providers/ACAuthProvider"


//
export class UserResponse {

    static #GetRequestToken(req: Request): string | undefined {
        return req.headers.authorization?.replace('Bearer ', '')
    }

    static async Authenticate(req: Request, res: Response): Promise<void> {
        try {
            const { username, password } = req.body
            const intRes = await User.Authenticate(<TUserCredentials>{
                username,
                password
            })
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }

    static async LogOut(req: Request, res: Response): Promise<void> {
        try {
            const intRes = await User.LogOut(UserResponse.#GetRequestToken(req))
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }

    static GetInfo(req: Request, res: Response): void {
        try {
            const intRes = User.GetUserInfo(UserResponse.#GetRequestToken(req))
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }

    static IsAuthenticated(req: Request, res: Response, next: NextFunction): void {
        if (User.IsAuthenticated(UserResponse.#GetRequestToken(req)))
            next()
        else
            throw new HttpErrorUnauthorized()
    }

    static IsNotAuthenticated(req: Request, res: Response, next: NextFunction): void {
        if (User.IsAuthenticated(UserResponse.#GetRequestToken(req)))
            throw new HttpErrorForbidden("User already logged")
        else
            next()
    }
}