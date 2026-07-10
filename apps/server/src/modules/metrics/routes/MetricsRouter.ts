//
//
//
import { Router } from "express"
//
import { ResponseHandler } from "../../core/ResponseHandler"
import { MetricsResponse } from "../response/MetricsResponse"


//
export const MetricsRouter: Router = Router()


//
MetricsRouter.route("/")
	.get(MetricsResponse.GetAllMetrics)

//
MetricsRouter.route("/:metric")
	.get(MetricsResponse.GetMetric)
