//
//
//
import type { Request, Response } from 'express'
//
import type { TJson } from '../../../types/TJson'
import { Assert } from '../../../utils/Assert'
import { Convert } from '../../../utils/Convert'
import { HttpError } from '../../errors/HttpErrors'
import { Plans } from "../../plan/Plans"
import { RequestHandler } from '../RequestHandler'
import { ResponseHandler } from '../ResponseHandler'
import type { TInternalResponse } from '../types/TInternalResponse'

export class PlanResponse {
    static Reload(req: Request, res: Response) {
        RequestHandler.CheckRequest(req)
        const { plan } = req.params

        Assert.Var<string>(plan, 'plan is not defined')

        Plans.get(plan)!.Reload(plan, req.__METAL_CURRENT_USER)
            .then((intRes: TInternalResponse<TJson>) => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }
}
