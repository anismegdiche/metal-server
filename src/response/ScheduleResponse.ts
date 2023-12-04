//
//
//
//
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Request, Response } from 'express'

import { ServerResponse } from './ServerResponse'
import { Schedule } from '../interpreter/Schedule'

export abstract class ScheduleResponse {
    public static Start(req: Request, res: Response) {
        try {
            const { job } = req.params
            const _intResp = Schedule.Start(job)
            ServerResponse.PrepareResponse({
                res,
                intResp: _intResp
            })
        } catch (error: any) {
            ServerResponse.Error(res, error)
        }
    }

    public static Stop(req: Request, res: Response) {
        try {
            const { job } = req.params
            const _intResp = Schedule.Stop(job)
            ServerResponse.PrepareResponse({
                res,
                intResp: _intResp
            })
        } catch (error: any) {
            ServerResponse.Error(res, error)
        }
    }
}