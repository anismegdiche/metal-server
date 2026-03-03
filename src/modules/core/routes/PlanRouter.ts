//
//
//
//
//
import { Router } from "express"
//
import { UserResponse } from "../response/UserResponse"
import { PlanResponse } from "../response/PlanResponse"
import { ResponseHandler } from "../ResponseHandler"


export const PlanRouter = Router()

//ROADMAP
PlanRouter.route("/:plan")
    .all(UserResponse.IsAuthenticated)
    .get(ResponseHandler.ResponseNotImplemented)
    .post(ResponseHandler.ResponseNotImplemented)
    .patch(ResponseHandler.ResponseNotImplemented)
    .delete(ResponseHandler.ResponseNotImplemented)

PlanRouter.route('/:plan/reload')
    .all(UserResponse.IsAuthenticated)
    .post(PlanResponse.ReloadPlan)