//
//
//
//
//
import { Router } from "express"
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { HTTP_METHOD } from "../lib/Const"
import { PlanResponse } from "../response/PlanResponse"

export const PlanRouter = Router()

//ROADMAP
PlanRouter.route("/:plan")
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE),
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)

PlanRouter.route('/:plan/reload')
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(PlanResponse.Reload)