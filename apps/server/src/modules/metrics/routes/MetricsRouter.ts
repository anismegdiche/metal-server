//
//
//
import { Router } from "express"
//
import { UserResponse } from "../../core/response/UserResponse"
import { MetricsResponse } from "../response/MetricsResponse"


//
export const MetricsRouter: Router = Router()


//
MetricsRouter.route("/")
	.all(UserResponse.IsAuthenticated)
	.get(MetricsResponse.GetAllMetrics)

//
MetricsRouter.route("/:metric")
	.all(UserResponse.IsAuthenticated)
	.get(MetricsResponse.GetMetric)

//
MetricsRouter.route("/:metricFrom/:metricTo")
	.all(UserResponse.IsAuthenticated)
	.get(MetricsResponse.GetMetricsRange)
