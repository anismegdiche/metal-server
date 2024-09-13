//
//
//
//
//
import { Router, Request, Response, NextFunction } from "express"
//
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { HTTP_METHOD } from "../lib/Const"
import { ScheduleResponse } from "../response/ScheduleResponse"

export const ScheduleRouter = Router()

//ROADMAP
ScheduleRouter.route("/:jobName")
    .all(ServerResponse.AllowOnlyCrudMethods,
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)

ScheduleRouter.route("/:jobName/start")
    .all((req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(ScheduleResponse.Start)

ScheduleRouter.route("/:jobName/stop")
    .all((req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(ScheduleResponse.Stop)