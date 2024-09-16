//
//
//
//
//
import { Router, Request, Response, NextFunction } from "express"
//
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { HTTP_METHOD } from "../lib/Const"
import { PlanResponse } from "../response/PlanResponse"

export const PlanRouter = Router()

//ROADMAP
PlanRouter.route("/:planName")
    .all(ServerResponse.AllowOnlyCrudMethods,
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)

PlanRouter.route('/:planName/reload')
    .all((req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    /**
     * @swagger
     * /plan/{planName}/reload:
     *   post:
     *     summary: Reload plan
     *     description: Reload plan by name
     *     tags: [Plan]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: planName
     *         schema:
     *           type: string
     *         required: true
     *         description: Plan name
     *     responses:
     *       200:
     *         description: Plan reloaded successfully
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Plan not found
     *       500:
     *         description: Internal server error
     */
    .post(PlanResponse.Reload)