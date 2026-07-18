//
//
//
import { Logger } from "../../utils/Logger"
import { ROUTE } from "../core/@consts"
import { ResponseHandler } from "../core/ResponseHandler"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { ApiRouter } from "./routes/ApiRouter"


//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(`Route: Enabling API, URL= ${ROUTE.API_PATH}`)
		ServerEndpoint.Api.use(`${ROUTE.API_PATH}/`, ResponseHandler.SetContentJson, ApiRouter)
	})
}
