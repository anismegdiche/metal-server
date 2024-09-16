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
    /**
     * @swagger
     * /cache/view:
     *   get:
     *     tags:
     *       - Cache
     *     summary: View cache
     *     description: Returns the current cache
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Cache data
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: object
     *                   description: Cache data
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal Server Error
     */
    .get(CacheResponse.View)

CacheRouter.route('/clean')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    /**
     * @swagger
     * /cache/clean:
     *   post:
     *     tags:
     *       - Cache
     *     summary: Clean cache
     *     description: Cleans the cache
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Cache cleaned
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal Server Error
     */
    .post(CacheResponse.Clean)

CacheRouter.route('/purge')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    /**
     * @swagger
     * /cache/purge:
     *   post:
     *     tags:
     *       - Cache
     *     summary: Purge cache
     *     description: Purges the cache
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Cache purged
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal Server Error
     */
    .post(CacheResponse.Purge)


//ROADMAP
CacheRouter.route('/info')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.NotImplemented)