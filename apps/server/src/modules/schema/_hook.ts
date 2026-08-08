//
//
//
import { Logger } from "@metal/logger"
import { ROUTE } from "../core/@consts"
import { ResponseHandler } from "../core/ResponseHandler"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { SchemaRouter } from "./routes/SchemaRouter"


//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(Logger.In, 'Enabling route', ROUTE.SCHEMA_PATH)
		ServerEndpoint.Api.use(`${ROUTE.SCHEMA_PATH}/`, Logger.RequestMiddleware, ResponseHandler.SetContentJson, SchemaRouter)
	})
}
