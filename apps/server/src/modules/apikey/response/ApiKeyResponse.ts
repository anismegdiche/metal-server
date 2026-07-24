//
//
//
import type { Request, Response } from "express"
//
import { Convert } from "../../../utils/Convert"
import { RequestHandler } from "../../core/RequestHandler"
import { ResponseHandler } from "../../core/ResponseHandler"
import type { HttpError } from "../../errors/HttpErrors"
import { ApiKey } from "../ApiKey"
import type { TApiKeyCreate } from "../@types"
import { z_TApiKeyCreate } from "../@types"
import { HttpErrorBadRequest } from "../../errors/HttpErrors"
//
export class ApiKeyResponse {
	static Create(req: Request, res: Response): void {
		RequestHandler.CheckRequestHasCurrentUser(req)
		//
		const parsed = z_TApiKeyCreate.safeParse(req.body)
		if (!parsed.success) {
			ResponseHandler.ResponseError(res, new HttpErrorBadRequest(parsed.error.issues.map((i) => i.message).join(", ")))
			return
		}
		//
		try {
			const intRes = ApiKey.Create(req.__METAL_CURRENT_USER.user, parsed.data as TApiKeyCreate)
			Convert.InternalResponseToResponse(res, intRes)
		} catch (error: unknown) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}
	//
	static List(req: Request, res: Response): void {
		RequestHandler.CheckRequestHasCurrentUser(req)
		//
		try {
			const intRes = ApiKey.List(req.__METAL_CURRENT_USER.user)
			Convert.InternalResponseToResponse(res, intRes)
		} catch (error: unknown) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}
	//
	static Get(req: Request, res: Response): void {
		RequestHandler.CheckRequestHasCurrentUser(req)
		//
		try {
			const id = String(req.params.id ?? "")
			const intRes = ApiKey.Get(req.__METAL_CURRENT_USER.user, id)
			Convert.InternalResponseToResponse(res, intRes)
		} catch (error: unknown) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}
	//
	static Revoke(req: Request, res: Response): void {
		RequestHandler.CheckRequestHasCurrentUser(req)
		//
		try {
			const id = String(req.params.id ?? "")
			const intRes = ApiKey.Revoke(req.__METAL_CURRENT_USER.user, id)
			Convert.InternalResponseToResponse(res, intRes)
		} catch (error: unknown) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}
}
