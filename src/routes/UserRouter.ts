//
//
//
//
//
import { NextFunction, Request, Response, Router } from 'express'
import { UserResponse } from '../response/UserResponse'
import { ServerResponse } from '../response/ServerResponse'
import { HTTP_METHOD } from '../lib/Const'
import { ParamsDictionary } from 'express-serve-static-core'
import { ParsedQs } from 'qs'

export const UserRouter = Router()

UserRouter.route('/login')
    .all((req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsNotAuthenticated,
        UserResponse.ParameterValidation,
        UserResponse.CheckParameters
    )
    .post(UserResponse.LogIn)

UserRouter.route('/logout')
    .all((req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    .get(UserResponse.LogOut)

UserRouter.route('/info')
    .all((req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    .get(UserResponse.GetInfo)