//
//
//
//
//
import { Router } from 'express'
//
import { CacheResponse } from '../response/CacheResponse'
import { UserResponse } from '../response/UserResponse'
import { ServerResponse } from '../response/ServerResponse'


export const CacheRouter = Router()

CacheRouter.route('/view')
    .all(UserResponse.IsAuthenticated)
    .get(CacheResponse.View)

CacheRouter.route('/clean')
    .all(UserResponse.IsAuthenticated)
    .post(CacheResponse.Clean)

CacheRouter.route('/purge')
    .all(UserResponse.IsAuthenticated)
    .post(CacheResponse.Purge)

//ROADMAP
CacheRouter.route('/info')
    .all(UserResponse.IsAuthenticated)
    .get(ServerResponse.ResponseNotImplemented)