//
//
//
import { Router } from "express"
//
import { UserResponse } from "../core/response/UserResponse"
import { MetalMcpAdapter } from "./adapter"

//
export const McpRouter: Router = Router()

//
McpRouter.route("/")
	.all(UserResponse.IsAuthenticated)
	.post(MetalMcpAdapter.HandleRequest)
