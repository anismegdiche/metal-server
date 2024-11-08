//
//
//
//
//
// eslint-disable-next-line unused-imports/no-unused-imports
import * as express from 'express'
import { TUserTokenInfo } from "./server/User"


//
declare global {
    namespace Express {
        interface Request {
            __METAL_CURRENT_USER?: TUserTokenInfo
        }
    }
}