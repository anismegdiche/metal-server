//
//
//
import { Logger } from "@metal/logger"
import { ROUTE } from "../core/@consts"
import { ResponseHandler } from "../core/ResponseHandler"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { Cache } from "./Cache"
import { CacheRouter } from "./routes/CacheRouter"


//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		if (Cache.IsEnabled) {
			Logger.Info(`Route: Enabling API, URL= ${ROUTE.API_CACHE_PATH}`)
			ServerEndpoint.Api.use(`${ROUTE.API_CACHE_PATH}/`, Logger.RequestMiddleware, ResponseHandler.SetContentJson, CacheRouter)
		}
	})
}
