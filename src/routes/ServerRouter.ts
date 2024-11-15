//
//
//
//
//
import { Router } from 'express'
//
import { UserResponse } from '../response/UserResponse'
import { ServerResponse } from '../response/ServerResponse'


export const ServerRouter = Router()

ServerRouter.route('/info')
    .get(ServerResponse.GetInfo)

ServerRouter.route('/reload')
    .all(UserResponse.IsAuthenticated)
    .post(ServerResponse.Reload)