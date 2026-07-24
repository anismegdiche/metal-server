//
//
//
import { Logger } from "@metal/logger"
import { ROUTE } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { McpRouter } from "./router"
import type { U__mcp } from "./types/U__mcp"

//
export function RegisterMiddleware(): void {
	if (!ConfigManager.Has("mcp")) return

	const mcpConfig = ConfigManager.Get<U__mcp>("mcp")
	if (!mcpConfig?.enabled) return

	const route = mcpConfig.route ?? ROUTE.MCP_PATH

	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(`Route: Enabling MCP, URL= ${route}`)
		ServerEndpoint.Api.use(route, Logger.RequestMiddleware, McpRouter)
	})
}
