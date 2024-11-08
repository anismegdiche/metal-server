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
import { HttpErrorUnauthorized, HttpErrorForbidden, HttpError } from "../server/HttpErrors"
import { TUserCredentials } from "../providers/ACAuthProvider"


//
export class UserResponse {

    static GetRequestToken(req: Request): string | undefined {
        return req.headers.authorization?.replace('Bearer ', '')
    }

    static async Authenticate(req: Request, res: Response): Promise<void> {
        const { username, password } = req.body
        User.Authenticate(<TUserCredentials>{
            username,
            password
        })
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static async LogOut(req: Request, res: Response): Promise<void> {
        User.LogOut(UserResponse.GetRequestToken(req))
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static GetInfo(req: Request, res: Response): void {
        User.GetUserInfo(UserResponse.GetRequestToken(req))
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }

    static IsAuthenticated(req: Request, res: Response, next: NextFunction): void {
        const tokenInfo = User.IsAuthenticated(UserResponse.GetRequestToken(req))
        if (tokenInfo) {
            req.__METAL_CURRENT_USER =  tokenInfo
            next()
        } else
            throw new HttpErrorUnauthorized()
    }

    static IsNotAuthenticated(req: Request, res: Response, next: NextFunction): void {
        const tokenInfo = User.IsAuthenticated(UserResponse.GetRequestToken(req))
        if (tokenInfo)
            throw new HttpErrorForbidden("User already logged")
        else
            next()
    }
}