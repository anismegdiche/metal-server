//
//
//
//
//
import { Request, Response } from 'express'

import { ServerResponse } from './ServerResponse'
import { Plan } from "../server/Plan"
import { Convert } from '../lib/Convert'


export class PlanResponse {

    public static Reload(req: Request, res: Response) {
        try {
            const { planName } = req.params
            const intRes = Plan.Reload(planName)
            Convert.InternalResponseToResponse(res, intRes)

        } catch (error: unknown) {
            ServerResponse.Error(res, error as Error)
        }
    }
}