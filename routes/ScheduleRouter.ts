//
//
//
//
//
import { Router } from "express"
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { HTTP_METHOD } from "../lib/Const"
import { ScheduleResponse } from "../response/ScheduleResponse"

export const ScheduleRouter = Router()

//ROADMAP
ScheduleRouter.route("/:job")
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE),
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)

ScheduleRouter.route("/:job/start")
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(ScheduleResponse.Start)

ScheduleRouter.route("/:job/stop")
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(ScheduleResponse.Stop)