//
//
//
//
//
import { Request, Response } from 'express'

import { ServerResponse } from './ServerResponse'
import { Plan } from "../server/Plan"
import { Convert } from '../lib/Convert'
import { HttpError } from "../server/HttpErrors"
import { TInternalResponse } from "../types/TInternalResponse"


export class PlanResponse {

    //@Logger.LogFunction()
    static Reload(req: Request, res: Response) {
        const { planName } = req.params
        Plan.Reload(planName)
            .then((intRes: TInternalResponse) => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }
}