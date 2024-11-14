//
//
//
//
//
import { Request, Response } from 'express'
//
import { ServerResponse } from './ServerResponse'
import { Schedule } from '../server/Schedule'
import { Convert } from '../lib/Convert'

export class ScheduleResponse {

    static Start(req: Request, res: Response) {
        ServerResponse.CheckRequest(req)
        try {
            const { jobName } = req.params
            const intRes = Schedule.Start(jobName, req.__METAL_CURRENT_USER)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }

    static Stop(req: Request, res: Response) {
        ServerResponse.CheckRequest(req)
        try {
            const { jobName } = req.params
            const intRes = Schedule.Stop(jobName, req.__METAL_CURRENT_USER)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.ResponseError(res, error as Error)
        }
    }
}