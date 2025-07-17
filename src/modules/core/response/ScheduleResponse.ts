//
//
//
import { Request, Response } from 'express'
//
import { Convert } from '../../../utils/Convert'
import { Schedule } from '../../plan/Schedule'
import { RequestHandler } from '../RequestHandler'
import { ResponseHandler } from '../ResponseHandler'

export class ScheduleResponse {
    static Start(req: Request, res: Response) {
        RequestHandler.CheckRequest(req)
        try {
            const { jobName } = req.params
            const intRes = Schedule.Start(jobName, req.__METAL_CURRENT_USER)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ResponseHandler.ResponseError(res, error as Error)
        }
    }

    static Stop(req: Request, res: Response) {
        RequestHandler.CheckRequest(req)
        try {
            const { jobName } = req.params
            const intRes = Schedule.Stop(jobName, req.__METAL_CURRENT_USER)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ResponseHandler.ResponseError(res, error as Error)
        }
    }
}
