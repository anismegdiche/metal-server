//
//
//
//
//
import { NextFunction, Router, Request, Response } from 'express'

import { HTTP_METHOD } from '../lib/Const'
import { CacheResponse } from '../response/CacheResponse'
import { UserResponse } from '../response/UserResponse'
import { ServerResponse } from '../response/ServerResponse'


export const CacheRouter = Router()

CacheRouter.route('/view')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    .get(CacheResponse.View)

CacheRouter.route('/clean')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(CacheResponse.Clean)

CacheRouter.route('/purge')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(CacheResponse.Purge)


//ROADMAP
CacheRouter.route('/info')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.NotImplemented)