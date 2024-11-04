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
import { TJson } from "../types/TJson"


export class PlanResponse {

    //@Logger.LogFunction()
    static Reload(req: Request, res: Response) {
        const { plan } = req.params
        Plan.Reload(plan)
            .then((intRes: TInternalResponse<TJson>) => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ServerResponse.ResponseError(res, error))
    }
}