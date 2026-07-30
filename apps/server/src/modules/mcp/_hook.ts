//
//
//
import { Logger } from "@metal/logger"
import { ROUTE } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { ServerEndpoint } from "../core/ServerEndpoint"
import type { U__server } from "../core/types/U__server"
import { McpToolsValidator } from "./McpToolsValidator"
import { McpRouter } from "./routes/McpRouter"

//
export function RegisterMiddleware(): void {
	
	const serverConfig = ConfigManager.Get<U__server>("server")
	const enableMcp = serverConfig?.endpoints?.["enable-mcp"] ?? false
	
	if (!enableMcp) 
		return

	McpToolsValidator.Validate()

	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info('Route: Enabling MCP, URL= ', ROUTE.MCP_PATH)
		ServerEndpoint.Api.use(ROUTE.MCP_PATH, Logger.RequestMiddleware, McpRouter)
	})
}
