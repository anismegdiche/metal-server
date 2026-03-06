//
//
//
import type { Request, Response } from "express"
//
import { Convert } from "../../../utils/Convert"
import type { HttpError } from "../../errors/HttpErrors"
import { RequestHandler } from "../RequestHandler"
import { ResponseHandler } from "../ResponseHandler"
import { ServerRuntime } from "../ServerRuntime"

//
export class ServerResponse {
	static async GetInfo(_req: Request, res: Response): Promise<void> {
		ServerRuntime.GetInfo()
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static async Reload(req: Request, res: Response): Promise<void> {
		RequestHandler.CheckRequest(req)
		ServerRuntime.Reload(req.__METAL_CURRENT_USER)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static async ReloadPlans(req: Request, res: Response): Promise<void> {
		RequestHandler.CheckRequest(req)
		ServerRuntime.ReloadPlans(req.__METAL_CURRENT_USER)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}
}
