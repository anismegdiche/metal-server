//
//
//
import { Request, Response } from 'express'
//
import { Convert } from '../../../utils/Convert'
import { HttpError } from '../../errors/HttpErrors'
import { Plans } from '../../plan/Plans'
import { TInternalResponse } from '../../schema/types/TInternalResponse'
import { TJson } from '../../../types/TJson'
import { ResponseHandler } from '../ResponseHandler'
import { RequestHandler } from '../RequestHandler'

export class PlanResponse {
    static Reload(req: Request, res: Response) {
        RequestHandler.CheckRequest(req)
        const { plan } = req.params
        Plans.Plans.get(plan)!.Reload(plan, req.__METAL_CURRENT_USER)
            .then((intRes: TInternalResponse<TJson>) => Convert.InternalResponseToResponse(res, intRes))
            .catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
    }
}
