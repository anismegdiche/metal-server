//
//
//
import { Router } from "express"
import { ResponseHandler } from "../../core/ResponseHandler"
//
import { CacheResponse } from "../response/CacheResponse"
import { UserResponse } from "../../core/response/UserResponse"


//
export const CacheRouter = Router()


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
