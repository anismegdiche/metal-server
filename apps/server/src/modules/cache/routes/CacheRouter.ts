//
//
//
import { Router } from "express"
//
import { ResponseHandler } from "../../core/ResponseHandler"
import { UserResponse } from "../../core/response/UserResponse"
import { CacheResponse } from "../response/CacheResponse"


//
export const CacheRouter: Router = Router()


//
CacheRouter.route("/view")
    .all(UserResponse.IsAuthenticated)
    .get(CacheResponse.View)

CacheRouter.route("/clean")
    .all(UserResponse.IsAuthenticated)
    .post(CacheResponse.Clean)

CacheRouter.route("/purge")
    .all(UserResponse.IsAuthenticated)
    .post(CacheResponse.Purge)

//ROADMAP
CacheRouter.route("/info")
    .all(UserResponse.IsAuthenticated)
    .get(ResponseHandler.ResponseNotImplemented)
