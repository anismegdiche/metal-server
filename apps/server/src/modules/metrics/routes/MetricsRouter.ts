//
//
//
import { Router } from "express"
//
import { MetricsResponse } from "../response/MetricsResponse"


//
export const MetricsRouter: Router = Router()


//
MetricsRouter.route("/")
	.get(MetricsResponse.GetAllMetrics)

//
MetricsRouter.route("/:metric")
	.get(MetricsResponse.GetMetric)

//
MetricsRouter.route("/:metricFrom/:metricTo")
	.get(MetricsResponse.GetMetricsRange)
