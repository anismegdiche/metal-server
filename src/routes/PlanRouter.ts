//
//
//
//
//
import { Router } from "express"
//
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { PlanResponse } from "../response/PlanResponse"


export const PlanRouter = Router()

//ROADMAP
PlanRouter.route("/:plan")
    .all(UserResponse.IsAuthenticated)
    .get(ServerResponse.ResponseNotImplemented)
    .post(ServerResponse.ResponseNotImplemented)
    .patch(ServerResponse.ResponseNotImplemented)
    .delete(ServerResponse.ResponseNotImplemented)

PlanRouter.route('/:plan/reload')
    .all(UserResponse.IsAuthenticated)
    .post(PlanResponse.Reload)