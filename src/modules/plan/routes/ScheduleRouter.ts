//
//
//
//
//
import { Router } from "express"
import { ResponseHandler } from "../../core/ResponseHandler"
import { ScheduleResponse } from "../response/ScheduleResponse"
//
import { UserResponse } from "../../core/response/UserResponse"

export const ScheduleRouter = Router()

//ROADMAP
ScheduleRouter.route("/:jobName")
	.all(UserResponse.IsAuthenticated)
	.get(ResponseHandler.ResponseNotImplemented)
	.post(ResponseHandler.ResponseNotImplemented)
	.patch(ResponseHandler.ResponseNotImplemented)
	.delete(ResponseHandler.ResponseNotImplemented)

ScheduleRouter.route("/:jobName/start").all(UserResponse.IsAuthenticated).post(ScheduleResponse.Start)

ScheduleRouter.route("/:jobName/stop").all(UserResponse.IsAuthenticated).post(ScheduleResponse.Stop)
