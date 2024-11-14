//
//
//
//
//
import { Router } from "express"
//
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { ScheduleResponse } from "../response/ScheduleResponse"


export const ScheduleRouter = Router()

//ROADMAP
ScheduleRouter.route("/:jobName")
    .all(UserResponse.IsAuthenticated)
    .get(ServerResponse.ResponseNotImplemented)
    .post(ServerResponse.ResponseNotImplemented)
    .patch(ServerResponse.ResponseNotImplemented)
    .delete(ServerResponse.ResponseNotImplemented)

ScheduleRouter.route("/:jobName/start")
    .all(UserResponse.IsAuthenticated)
    .post(ScheduleResponse.Start)

ScheduleRouter.route("/:jobName/stop")
    .all(UserResponse.IsAuthenticated)
    .post(ScheduleResponse.Stop)