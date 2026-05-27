//
//
//
import { Logger } from "../../utils/Logger"
import { ROUTE } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { ResponseHandler } from "../core/ResponseHandler"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { UserRouter } from "../core/routes/UserRouter"


//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		if (ConfigManager.Get("server.authentication")) {
			Logger.Info(`Route: Enabling API, URL= ${ROUTE.USER_PATH}`)
			ServerEndpoint.Api.use(`${ROUTE.USER_PATH}/`, ResponseHandler.SetContentJson, UserRouter)
		}
	})
}
