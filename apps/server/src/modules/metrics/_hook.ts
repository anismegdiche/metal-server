//
//
//
import { Logger } from "@metal/logger"
import { ROUTE } from "../core/@consts"
import { ResponseHandler } from "../core/ResponseHandler"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { MetricsRouter } from "./routes/MetricsRouter"


//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(`Route: Enabling API, URL= ${ROUTE.METRICS_PATH}`)
		ServerEndpoint.Api.use(`${ROUTE.METRICS_PATH}/`, ResponseHandler.SetContentJson, MetricsRouter)
	})
}
