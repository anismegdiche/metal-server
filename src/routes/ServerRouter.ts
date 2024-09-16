//
//
//
//
//
import { Router, Request, Response, NextFunction } from 'express'
//
import { UserResponse } from '../response/UserResponse'
import { ServerResponse } from '../response/ServerResponse'
import { HTTP_METHOD } from '../lib/Const'

export const ServerRouter = Router()


ServerRouter.route('/info')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    /**
     * @swagger
     * /server/info:
     *   get:
     *     tags:
     *     - Server
     *     summary: Get server information
     *     description: Returns server information
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Server information
     *       #  content:
     *       #    application/json:
     *       #      schema:
     *       #        $ref: '#/components/schemas/ServerInfo'
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal Server Error
     */
    .get(ServerResponse.GetInfo)

ServerRouter.route('/reload')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    /**
     * @swagger
     * /server/reload:
     *   post:
     *     tags:
     *     - Server
     *     summary: Reload server
     *     description: Reloads the server
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Server reloaded
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal Server Error
     */
    .post(ServerResponse.Reload)