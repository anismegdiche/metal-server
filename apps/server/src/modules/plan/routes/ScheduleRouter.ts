//
//
//
import { Router } from "express"
//
import { ResponseHandler } from "../../core/ResponseHandler"
import { UserResponse } from "../../core/response/UserResponse"
import { ScheduleResponse } from "../response/ScheduleResponse"


//
export const ScheduleRouter: Router = Router()


//ROADMAP
ScheduleRouter.route("/:jobName")
	.all(UserResponse.IsAuthenticated)
	.get(ResponseHandler.ResponseNotImplemented)
	.post(ResponseHandler.ResponseNotImplemented)
	.patch(ResponseHandler.ResponseNotImplemented)
	.delete(ResponseHandler.ResponseNotImplemented)

ScheduleRouter.route("/:jobName/start").all(UserResponse.IsAuthenticated).post(ScheduleResponse.Start)

ScheduleRouter.route("/:jobName/stop").all(UserResponse.IsAuthenticated).post(ScheduleResponse.Stop)
