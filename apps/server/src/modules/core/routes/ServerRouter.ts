//
//
//
import { Router } from "express"
//
import { ServerResponse } from "../response/ServerResponse"
import { UserResponse } from "../response/UserResponse"


//
export const ServerRouter: Router = Router()


//
ServerRouter.route("/info")
    .get(ServerResponse.GetInfo)

ServerRouter.route("/reload")
    .all(UserResponse.IsAuthenticated)
    .post(ServerResponse.Reload)

ServerRouter.route("/reload-plans")
    .all(UserResponse.IsAuthenticated)
    .post(ServerResponse.ReloadPlans)
