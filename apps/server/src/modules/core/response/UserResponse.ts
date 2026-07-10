//
//
//
import type { NextFunction, Request, Response } from "express"
//
import { Convert } from "../../../utils/Convert"
import type { TUserCredentials } from "../../auth/@types"
import { User } from "../../auth/User"
import { type HttpError, HttpErrorForbidden, HttpErrorUnauthorized } from "../../errors/HttpErrors"
import { ResponseHandler } from "../ResponseHandler"

//
export class UserResponse {
	static GetRequestToken(req: Request): string | undefined {
		return req.headers.authorization?.replaceAll("Bearer ", "")
	}

	static async Authenticate(req: Request, res: Response): Promise<void> {
		const { username, password } = req.body
		User.Authenticate(<TUserCredentials>{
			username,
			password,
		})
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static async LogOut(req: Request, res: Response): Promise<void> {
		User.LogOut(UserResponse.GetRequestToken(req))
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static GetInfo(req: Request, res: Response): void {
		User.GetUserInfo(UserResponse.GetRequestToken(req))
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static IsAuthenticated(req: Request, _res: Response, next: NextFunction): void {
		const tokenInfo = User.IsAuthenticated(UserResponse.GetRequestToken(req))
		if (tokenInfo) {
			req.__METAL_CURRENT_USER = tokenInfo
			next()
		} else {
			throw new HttpErrorUnauthorized()
		}
	}

	static IsNotAuthenticated(req: Request, _res: Response, next: NextFunction): void {
		const tokenInfo = User.IsAuthenticated(UserResponse.GetRequestToken(req))
		if (tokenInfo) {
			throw new HttpErrorForbidden("User already logged")
		} else {
			next()
		}
	}
}
