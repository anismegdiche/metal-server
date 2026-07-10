//
//
//
import { Router } from "express"
//
import { ResponseHandler } from "../../core/ResponseHandler"
import { UserResponse } from "../../core/response/UserResponse"
import { PlanResponse } from "../response/PlanResponse"


//
export const PlanRouter: Router = Router()


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
	// .all(UserResponse.IsAuthenticated)
	.get(PlanResponse.GetPlanMetrics)
