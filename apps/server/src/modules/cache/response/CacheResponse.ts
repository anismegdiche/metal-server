//
//
//
import type { Request, Response } from "express"
//
import { Convert } from "../../../utils/Convert"
import { Cache } from "../Cache"
import type { HttpError } from "../../errors/HttpErrors"
import { RequestHandler } from "../../core/RequestHandler"
import { ResponseHandler } from "../../core/ResponseHandler"

//
export class CacheResponse {
	static View(req: Request, res: Response): void {
		RequestHandler.CheckRequestHasCurrentUser(req)
		Cache.View(req.__METAL_CURRENT_USER)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static Clean(req: Request, res: Response): void {
		RequestHandler.CheckRequestHasCurrentUser(req)
		Cache.Clean(req.__METAL_CURRENT_USER)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static Purge(req: Request, res: Response): void {
		RequestHandler.CheckRequestHasCurrentUser(req)
		Cache.Purge(req.__METAL_CURRENT_USER)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}
}
