//
//
//
import type { Request, Response } from 'express'
//
import { Assert } from '../../../utils/Assert'
import { Convert } from '../../../utils/Convert'
import { HttpError } from '../../errors/HttpErrors'
import { PlansManager } from "../../plan/PlansManager"
import { RequestHandler } from '../RequestHandler'
import { ResponseHandler } from '../ResponseHandler'

export class PlanResponse {
    static ReloadPlan(req: Request, res: Response): void {
        RequestHandler.CheckRequest(req)

        const { plan } = req.params

        Assert.Var<string>(plan, 'plan is not defined')

        PlansManager.ReloadPlan(plan!, req.__METAL_CURRENT_USER)
            .then(intRes => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }
}
