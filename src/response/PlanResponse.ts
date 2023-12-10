//
//
//
//
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Request, Response } from 'express'

import { ServerResponse } from './ServerResponse'
import { Plans } from '../providers/Plan'


export class PlanResponse {

    public static Reload(req: Request, res: Response) {
        try {
            const { plan } = req.params
            const _intRes = Plans.Reload(plan)
            ServerResponse.PrepareResponse({
                res,
                intRes: _intRes
            })

        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }
}