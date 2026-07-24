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

McpRouter.route("/")
	.get((_req, res) => {
		res.writeHead(405).end(
			JSON.stringify({
				jsonrpc: "2.0",
				error: {
					code: -32000,
					message: "Method not allowed.",
				},
				id: null,
			}),
		)
	})

McpRouter.route("/")
	.delete((_req, res) => {
		res.writeHead(405).end(
			JSON.stringify({
				jsonrpc: "2.0",
				error: {
					code: -32000,
					message: "Method not allowed.",
				},
				id: null,
			}),
		)
	})
