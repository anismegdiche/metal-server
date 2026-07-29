//
//
//
import { Router } from "express"
//
import { UserResponse } from "../../core/response/UserResponse"
import { McpAdapter } from "../McpAdapter"

//
export const McpRouter: Router = Router()

//
McpRouter.route("/")
	.all(UserResponse.IsAuthenticated)
	.post(McpAdapter.HandleRequest)
