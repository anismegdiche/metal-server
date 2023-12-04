//
//
//
//
//
import { Router } from 'express'
import { UserResponse } from '../response/UserResponse'
import { ServerResponse } from '../response/ServerResponse'
import { HTTP_METHOD } from '../lib/Const'

export const ServerRouter = Router()

ServerRouter.route('/info')
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.GetInfo)

ServerRouter.route('/reload')
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(ServerResponse.Reload)