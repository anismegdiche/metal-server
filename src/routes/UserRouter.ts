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
    .post(UserResponse.LogIn)

UserRouter.route('/logout')
    .all(UserResponse.IsNotAuthenticated)
    .post(UserResponse.LogOut)

UserRouter.route('/info')
    .all(UserResponse.IsNotAuthenticated)
    .get(UserResponse.GetInfo)