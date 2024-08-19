//
//
//
//
//
import { Request, Response, NextFunction } from 'express'
import { checkSchema, validationResult } from 'express-validator'
import _ from 'lodash'
//
import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from '../lib/Const'
import { User } from '../server/User'
import { Config } from '../server/Config'
import { ServerResponse } from '../response/ServerResponse'
import { Convert } from '../lib/Convert'
import { HttpBadRequestError } from '../server/HttpErrors'
import { UserParamsSchema } from "../jsonschema/UserParamsSchema"


export class UserResponse {
    
    static readonly ParameterValidation = checkSchema(UserParamsSchema)

    static #GetRequestToken(req: Request): string | undefined {
        return req.headers.authorization?.replace('Bearer ', '')
    }

    static CheckParameters(req: Request, res: Response, next: NextFunction): void {
        // Check for validation errors
        const errors = validationResult(req)
        if (errors.isEmpty()) {
            next()
        } else {
            // eslint-disable-next-line you-dont-need-lodash-underscore/map
            const errorMessages = _.map(
                errors.array(),
                (item: any) => `${item.path}: ${item.msg} in ${item.location}`
            )
            ServerResponse.Error(res, new HttpBadRequestError(errorMessages.join(', ')))
        }

    }

    static LogIn(req: Request, res: Response): void {
        try {
            const { username, password } = req.body
            if (typeof username === 'string' && typeof password === 'string') {
                const intRes = User.LogIn(username, password)
                Convert.InternalResponseToResponse(res, intRes)
            } else {
                ServerResponse.BadRequest(res)
            }
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    static LogOut(req: Request, res: Response): void {
        try {
            const token = UserResponse.#GetRequestToken(req)
            const intRes = User.LogOut(token)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    static GetInfo(req: Request, res: Response): void {
        try {
            const token = UserResponse.#GetRequestToken(req)
            const intRes = User.GetInfo(token)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    static IsAuthenticated(req: Request, res: Response, next: NextFunction): void {
        if (!Config.Flags.EnableAuthentication) {
            next()
            return
        }

        const token = UserResponse.#GetRequestToken(req)
        if (User.IsAuthenticated(token)) {
            next()
            return
        }

        res.status(HTTP_STATUS_CODE.FORBIDDEN).json({
            message: HTTP_STATUS_MESSAGE.FORBIDDEN
        })
    }

    static IsNotAuthenticated(req: Request, res: Response, next: NextFunction): void {
        if (!Config.Flags.EnableAuthentication) {
            next()
            return
        }

        const token = UserResponse.#GetRequestToken(req)
        if (User.IsAuthenticated(token)) {
            res
                .status(HTTP_STATUS_CODE.FORBIDDEN)
                .json({ message: "User already logged" })
                .end()
        }
        next()
    }
}