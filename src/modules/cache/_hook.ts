//
//
//
import { Logger } from "../../utils/Logger"
import { ROUTE } from "../core/@consts"
import { ResponseHandler } from "../core/ResponseHandler"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { CacheRouter } from "./routes/CacheRouter"
import { Cache } from "./Cache"


//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		if (Cache.IsEnabled) {
			Logger.Info(`Route: Enabling API, URL= ${ROUTE.CACHE_PATH}`)
			ServerEndpoint.Api.use(`${ROUTE.CACHE_PATH}/`, ResponseHandler.SetContentJson, CacheRouter)
		}
	})
}
