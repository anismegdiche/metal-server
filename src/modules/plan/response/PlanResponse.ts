//
//
//
import type { Request, Response } from "express"
//
import { Assert } from "../../../utils/Assert"
import { Convert } from "../../../utils/Convert"
import { RequestHandler } from "../../core/RequestHandler"
import { ResponseHandler } from "../../core/ResponseHandler"
import type { HttpError } from "../../errors/HttpErrors"
import { PlansManager } from "../PlansManager"

export class PlanResponse {
	static async ReloadPlan(req: Request, res: Response): Promise<void> {
		RequestHandler.CheckRequest(req)

		const { plan } = req.params

		Assert.Var<string>(plan, "plan is not defined")

		PlansManager.ReloadPlan(plan, req.__METAL_CURRENT_USER)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static async GetPlanMetrics(req: Request, res: Response): Promise<void> {
		RequestHandler.CheckRequest(req)

		const { plan } = req.params

		Assert.Var<string>(plan, "plan is not defined")

		PlansManager.GetPlanMetrics(plan)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}
}
