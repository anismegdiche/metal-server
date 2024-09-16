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
import { ScheduleResponse } from "../response/ScheduleResponse"

export const ScheduleRouter = Router()

//ROADMAP
ScheduleRouter.route("/:jobName")
    .all(ServerResponse.AllowOnlyCrudMethods,
        UserResponse.IsAuthenticated
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)

ScheduleRouter.route("/:jobName/start")
    .all((req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    /**
     * @swagger
     * /schedule/{jobName}/start:
     *   post:
     *     summary: Start a job
     *     description: Start a job with the given job name
     *     security:
     *       - bearerAuth: []
     *     tags:
     *       - Schedule
     *     parameters:
     *       - in: path
     *         name: jobName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the job to start
     *     responses:
     *       200:
     *         description: Job started successfully
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Job not found
     *       500:
     *         description: Internal server error
     */
    .post(ScheduleResponse.Start)

ScheduleRouter.route("/:jobName/stop")
    .all((req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.POST),
        UserResponse.IsAuthenticated
    )
    /**
     * @swagger
     * /schedule/{jobName}/stop:
     *   post:
     *     summary: Stop a job
     *     description: Stop a job with the given job name
     *     security:
     *       - bearerAuth: []
     *     tags:
     *       - Schedule
     *     parameters:
     *       - in: path
     *         name: jobName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the job to stop
     *     responses:
     *       200:
     *         description: Job stopped successfully
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Job not found
     *       500:
     *         description: Internal server error
     */
    .post(ScheduleResponse.Stop)