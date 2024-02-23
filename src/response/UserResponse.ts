//
//
//
//
//
import { Request, Response, NextFunction } from 'express'
//
import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from '../lib/Const'
import { User } from '../server/User'
import { Config } from '../server/Config'
import { ServerResponse } from '../response/ServerResponse'
import { Convert } from '../lib/Convert'
import { checkSchema, validationResult } from 'express-validator'
import { BadRequestError } from '../server/HttpErrors'
import _ from 'lodash'


export class UserResponse {

    static #GetRequestToken(req: Request): string | undefined {
        return req.headers.authorization?.replace('Bearer ', '')
    }

    static readonly ParameterValidation = checkSchema({
        username: {
            in: ['body'],
            trim: true,
            isString: true,
            errorMessage: 'must be a string'
        },
        password: {
            in: ['body'],
            trim: true,
            isString: true,
            errorMessage: 'must be a string'
        }
    })

    static CheckParameters(req: Request, res: Response, next: NextFunction): void {
        // Check for validation errors
        const errors = validationResult(req)
        if (errors.isEmpty()) {
            next()
        } else {
            const errorMessages = _.map(
                errors.array(),
                (item: any) => `${item.path}: ${item.msg} in ${item.location}`
            )
            ServerResponse.Error(res, new BadRequestError(errorMessages.join(', ')))
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