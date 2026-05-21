//
//
//
//
//
import { Router } from "express"
import { ResponseHandler } from "../ResponseHandler"
import { PlanResponse } from "../response/PlanResponse"
//
import { UserResponse } from "../response/UserResponse"

export const PlanRouter = Router()

//ROADMAP
PlanRouter.route("/:plan")
	.all(UserResponse.IsAuthenticated)
	.get(ResponseHandler.ResponseNotImplemented)
	.post(ResponseHandler.ResponseNotImplemented)
	.patch(ResponseHandler.ResponseNotImplemented)
	.delete(ResponseHandler.ResponseNotImplemented)

PlanRouter.route("/:plan/reload")
	.all(UserResponse.IsAuthenticated)
	.post(PlanResponse.ReloadPlan)

PlanRouter.route("/:plan/metrics")
	.all(UserResponse.IsAuthenticated)
	.post(PlanResponse.GetPlanMetrics)
