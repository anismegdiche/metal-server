//
//
//
import { Logger } from "@metal/logger"
import { ROUTE } from "../core/@consts"
import { ResponseHandler } from "../core/ResponseHandler"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { ApiKeyRouter } from "./routes/ApiKeyRouter"
//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(`Route: Enabling API, URL= ${ROUTE.API_KEYS_PATH}`)
		ServerEndpoint.Api.use(`${ROUTE.API_KEYS_PATH}/`, Logger.RequestMiddleware, ResponseHandler.SetContentJson, ApiKeyRouter)
	})
}
