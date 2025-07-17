//
//
//
//
//
import { Router } from 'express'
//
import { UserResponse } from '../response/UserResponse'


export const UserRouter = Router()

UserRouter.route('/login')
    .all(UserResponse.IsNotAuthenticated)
    .post(UserResponse.Authenticate)

UserRouter.route('/logout')
    .all(UserResponse.IsAuthenticated)
    .post(UserResponse.LogOut)

UserRouter.route('/info')
    .all(UserResponse.IsAuthenticated)
    .get(UserResponse.GetInfo)