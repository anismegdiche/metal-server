//
//
//
import type { Request, Response } from "express"
//
import { Convert } from "../../../utils/Convert"
import { ResponseHandler } from "../../core/ResponseHandler"
import type { HttpError } from "../../errors/HttpErrors"
import { MetricsCollector } from "../MetricsCollector"


//
export class MetricsResponse {

	static async GetAllMetrics(req: Request, res: Response): Promise<void> {

		MetricsCollector.GetAllMetrics()
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static async GetMetric(req: Request, res: Response): Promise<void> {

		const { metric } = req.params

		MetricsCollector.GetMetric(metric as string)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static async GetMetricsRange(req: Request, res: Response): Promise<void> {

		const { metricFrom, metricTo } = req.params

		MetricsCollector.GetMetricsRange(metricFrom as string, metricTo as string)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}
}
