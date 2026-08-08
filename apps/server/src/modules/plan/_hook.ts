//
//
//
import { Logger } from "@metal/logger"
import { ROUTE } from "../core/@consts"
import { ResponseHandler } from "../core/ResponseHandler"
import { ServerEndpoint } from "../core/ServerEndpoint"
import { PlanRouter } from "./routes/PlanRouter"
import { ScheduleRouter } from "./routes/ScheduleRouter"


//
export function RegisterMiddleware(): void {
	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(Logger.In, 'Enabling route', ROUTE.API_PLAN_PATH)
		ServerEndpoint.Api.use(`${ROUTE.API_PLAN_PATH}/`, Logger.RequestMiddleware, ResponseHandler.SetContentJson, PlanRouter)
	})

	ServerEndpoint.RegisterMiddleware(() => {
		Logger.Info(Logger.In, 'Enabling route', ROUTE.API_SCHEDULE_PATH)
		ServerEndpoint.Api.use(`${ROUTE.API_SCHEDULE_PATH}/`, Logger.RequestMiddleware, ResponseHandler.SetContentJson, ScheduleRouter)
	})
}
