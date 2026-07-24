//
//
//
import { Router } from "express"
//
import { UserResponse } from "../../core/response/UserResponse"
import { ApiKeyResponse } from "../response/ApiKeyResponse"
//
export const ApiKeyRouter: Router = Router()
//
ApiKeyRouter.route("/")
	.all(UserResponse.IsAuthenticated)
	.get(ApiKeyResponse.List)
	.post(ApiKeyResponse.Create)
//
ApiKeyRouter.route("/:id")
	.all(UserResponse.IsAuthenticated)
	.get(ApiKeyResponse.Get)
	.delete(ApiKeyResponse.Revoke)
