//
//
//
//
//
import { NextFunction, Request, Response, Router } from 'express'
//
import { UserResponse } from '../response/UserResponse'
import { ServerResponse } from '../response/ServerResponse'
import { HTTP_METHOD } from '../lib/Const'


export const UserRouter = Router()

UserRouter.route('/login')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsNotAuthenticated,
        UserResponse.ParameterValidation,
        UserResponse.CheckParameters
    )
    /**
     * @swagger
     * /user/login:
     *   post:
     *     summary: Login to the Metal server
     *     description: Returns a JWT token if the credentials are valid
     *     tags:
     *       - User
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Successful login
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 token:
     *                   type: string
     *                   description: JWT token
     *       401:
     *         description: Invalid credentials
     *       500:
     *         description: Internal server error
     */
    .post(UserResponse.LogIn)

UserRouter.route('/logout')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    /**
     * @swagger
     * /user/logout:
     *   get:
     *     summary: Logout from the Metal server
     *     description: Invalidates the JWT token
     *     tags:
     *       - User
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Successful logout
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    .get(UserResponse.LogOut)

UserRouter.route('/info')
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated
    )
    /**
     * @swagger
     * /user/info:
     *   get:
     *     summary: Get user information
     *     description: Returns user information
     *     tags:
     *       - User
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Successful retrieval of user information
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: integer
     *                   description: User ID
     *                 name:
     *                   type: string
     *                   description: User name
     *                 email:
     *                   type: string
     *                   description: User email
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    .get(UserResponse.GetInfo)