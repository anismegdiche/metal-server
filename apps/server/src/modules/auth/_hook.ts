//
//
//
import { Logger } from "@metal/logger"
import { ROUTE } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { ResponseHandler } from "../core/ResponseHandler"
import { UserRouter } from "../core/routes/UserRouter"
import { ServerEndpoint } from "../core/ServerEndpoint"


//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		if (ConfigManager.Get("server.authentication")) {
			Logger.Info(Logger.In, 'Enabling route', ROUTE.USER_PATH)
			ServerEndpoint.Api.use(`${ROUTE.USER_PATH}/`, Logger.RequestMiddleware, ResponseHandler.SetContentJson, UserRouter)
		}
	})
}
