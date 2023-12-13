//
//
//
//
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Request, Response } from 'express'

import { ServerResponse } from './ServerResponse'
import { Schedule } from '../server/Schedule'

export class ScheduleResponse {
    public static Start(req: Request, res: Response) {
        try {
            const { job } = req.params
            const _intRes = Schedule.Start(job)
            ServerResponse.PrepareResponse({
                res,
                intRes: _intRes
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }

    public static Stop(req: Request, res: Response) {
        try {
            const { job } = req.params
            const _intRes = Schedule.Stop(job)
            ServerResponse.PrepareResponse({
                res,
                intRes: _intRes
            })
        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }
}