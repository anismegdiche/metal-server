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
import { PlanResponse } from "../response/PlanResponse"

export const PlanRouter = Router()

//ROADMAP
PlanRouter.route("/:planName")
    .all(ServerResponse.AllowOnlyCrudMethods,
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)

PlanRouter.route('/:planName/reload')
    .all((req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    .post(PlanResponse.Reload)