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
    public static Start(req: Request, res: Response) {
        try {
            const { jobName } = req.params
            const intRes = Schedule.Start(jobName)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    public static Stop(req: Request, res: Response) {
        try {
            const { jobName } = req.params
            const intRes = Schedule.Stop(jobName)
            Convert.InternalResponseToResponse(res, intRes)
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }
}