//
//
//
import type { Request, Response } from "express"
import { Assert } from "../../../utils/Assert"
//
import { Convert } from "../../../utils/Convert"
import { Schedule } from "../Schedule"
import { RequestHandler } from "../../core/RequestHandler"
import { ResponseHandler } from "../../core/ResponseHandler"

export class ScheduleResponse {
	static Start(req: Request, res: Response) {
		RequestHandler.CheckRequestHasCurrentUser(req)
		try {
			const { jobName } = req.params

			Assert.Var<string>(jobName, "jobName is not defined")

			const intRes = Schedule.Start(jobName, req.__METAL_CURRENT_USER)
			Convert.InternalResponseToResponse(res, intRes)
		} catch (error: unknown) {
			ResponseHandler.ResponseError(res, error as Error)
		}
	}

	static Stop(req: Request, res: Response) {
		RequestHandler.CheckRequestHasCurrentUser(req)
		try {
			const { jobName } = req.params

			Assert.Var<string>(jobName, "jobName is not defined")

			const intRes = Schedule.Stop(jobName, req.__METAL_CURRENT_USER)
			Convert.InternalResponseToResponse(res, intRes)
		} catch (error: unknown) {
			ResponseHandler.ResponseError(res, error as Error)
		}
	}
}
