//
//
//
//
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Request, Response } from 'express'

import { ServerResponse } from './ServerResponse'
import { Plans } from '../interpreter/Plans'


export abstract class PlanResponse {

    public static Reload(req: Request, res: Response) {
        try {
            const { plan } = req.params
            const _intResp = Plans.Reload(plan)
            ServerResponse.PrepareResponse({
                res,
                intResp: _intResp
            })

        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }
}