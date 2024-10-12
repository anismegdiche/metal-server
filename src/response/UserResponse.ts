//
//
//
//
//
import { Request, Response, NextFunction } from 'express'
//
import { TUserCredentials, User } from '../server/User'
import { Config } from '../server/Config'
import { ServerResponse } from '../response/ServerResponse'
import { Convert } from '../lib/Convert'
import { HttpErrorUnauthorized, HttpErrorForbidden } from "../server/HttpErrors"


export class UserResponse {
    
    static #GetRequestToken(req: Request): string | undefined {
        return req.headers.authorization?.replace('Bearer ', '')
    }

    //@Logger.LogFunction()
    static LogIn(req: Request, res: Response): void {
        try {
            const { username, password } = req.body
            const intRes = User.LogIn(<TUserCredentials>{
                username,
                password
            })
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }

    //@Logger.LogFunction()
    static LogOut(req: Request, res: Response): void {
        try {
            const token = UserResponse.#GetRequestToken(req)
            const intRes = User.LogOut(token)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }

    //@Logger.LogFunction()
    static GetInfo(req: Request, res: Response): void {
        try {
            const token = UserResponse.#GetRequestToken(req)
            const intRes = User.GetInfo(token)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }

    //@Logger.LogFunction()
    static IsAuthenticated(req: Request, res: Response, next: NextFunction): void {
        const token = UserResponse.#GetRequestToken(req)
        if (!User.IsAuthenticated(token))
            throw new HttpErrorUnauthorized()        
        next()
    }

    //@Logger.LogFunction()
    static IsNotAuthenticated(req: Request, res: Response, next: NextFunction): void {
        if (!Config.Flags.EnableAuthentication) {
            next()
            return
        }

        const token = UserResponse.#GetRequestToken(req)
        if (User.IsAuthenticated(token)) {
            throw new HttpErrorForbidden("User already logged")
        }
        next()
    }
}