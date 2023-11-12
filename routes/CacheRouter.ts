//
//
//
//
//
import { Router } from 'express'

import { HTTP_METHOD } from '../lib/Const'
import { CacheResponse } from '../response/CacheResponse'
import { UserResponse } from '../response/UserResponse'
import { ServerResponse } from '../response/ServerResponse'


export const CacheRouter = Router()

CacheRouter.route('/view')
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    .get(CacheResponse.View)

CacheRouter.route('/clean')
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(CacheResponse.Clean)

CacheRouter.route('/purge')
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(CacheResponse.Purge)


//ROADMAP
CacheRouter.route('/info')
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.NotImplemented)