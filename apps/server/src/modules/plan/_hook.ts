//
//
//
import { Logger } from "../../utils/Logger"
import { ROUTE } from "../core/@consts"
import { ResponseHandler } from "../core/ResponseHandler"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { PlanRouter } from "./routes/PlanRouter"
import { ScheduleRouter } from "./routes/ScheduleRouter"


//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(`Route: Enabling API, URL= ${ROUTE.PLAN_PATH}`)
		ServerEndpoint.Api.use(`${ROUTE.PLAN_PATH}/`, ResponseHandler.SetContentJson, PlanRouter)
	})

	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(`Route: Enabling API, URL= ${ROUTE.SCHEDULE_PATH}`)
		ServerEndpoint.Api.use(`${ROUTE.SCHEDULE_PATH}/`, ResponseHandler.SetContentJson, ScheduleRouter)
	})
}
