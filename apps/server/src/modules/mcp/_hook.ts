//
//
//
import { Logger } from "@metal/logger"
import { ROUTE } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import type { U__server } from "../core/types/U__server"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { McpToolsValidator } from "./McpToolsValidator"
import { McpRouter } from "./router"

//
export function RegisterMiddleware(): void {
	McpToolsValidator.Validate()

	const serverConfig = ConfigManager.Get<U__server>("server")
	const enableMcp = serverConfig?.endpoints?.["enable-mcp"] ?? false
	if (!enableMcp) return

	const hasAuth = ConfigManager.Has("server.authentication")
	if (!hasAuth) {
		Logger.Warn("[MCP] Warning: MCP endpoint is enabled without authentication. Restrict to trusted networks.")
	}

	const route = ROUTE.MCP_PATH

	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(`Route: Enabling MCP, URL= ${route}`)
		ServerEndpoint.Api.use(route, Logger.RequestMiddleware, McpRouter)
	})
}
