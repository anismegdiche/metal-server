//
//
//
//
//
import { CronJob } from 'cron'
import _ from 'lodash'

import { TInternalResponse } from '../types/TInternalResponse'
import { TSchedule } from '../types/TSchedule'
import { Logger } from '../utils/Logger'
import { Config } from './Config'
import { JsonHelper } from '../lib/JsonHelper'
import { HttpResponse } from "./HttpResponse"
import { HttpErrorNotFound } from "./HttpErrors"
import { TJson } from "../types/TJson"
import { PERMISSION, Roles } from "./Roles"
import { TUserTokenInfo } from "./User"
import { Plans } from "./Plans"

export type TScheduleConfig = {
    plan: string
    entity: string
    cron: string
}

export class Schedule {

    static Jobs: TSchedule[] = [] //NOSONAR

    @Logger.LogFunction()
    static async CreateAndStartAll() {
        if (!Config.Configuration?.schedules) {
            return undefined
        }

        const scheduleConfig: Array<[string, TScheduleConfig]> = Object.entries(Config.Configuration.schedules)

        for (const [_jobName, _scheduleParams] of scheduleConfig) {
            Logger.Info(`${Logger.In} Schedule.CreateAndStartAll: Creating and Starting job '${_jobName}'`)
            const currentDate = new Date()
            currentDate.setSeconds(currentDate.getSeconds() + 1)

            const _cron = (_scheduleParams.cron === '@start')
                ? currentDate
                : _scheduleParams.cron

            const _plan = _scheduleParams.plan
            const _timezone = Config.Configuration?.server?.timezone as string ?? Config.DEFAULTS['server.timezone']
            const _cronJob = new CronJob(
                _cron,
                Schedule.Job.bind(this, _plan, _jobName, _scheduleParams),
                null,
                true,
                _timezone
            )

            this.Jobs.push(<TSchedule>{
                schedule: _jobName,
                cronJob: _cronJob
            })
        }
    }

    static Job(plan: string, jobName: string, scheduleParams: TScheduleConfig) {
        Logger.Debug(`${Logger.In} Schedule.Job: Running job '${jobName}'`)
        Plans.Plans.get(plan)?.ProcessScheduleConfig(scheduleParams)
            .then(() => {
                Logger.Debug(`${Logger.Out} Schedule.Job: job '${jobName}' terminated`)
            })
            .catch((error) => {
                Logger.Error(`${Logger.Out} Schedule.Job: Error has occured with '${jobName}' : ${JsonHelper.Stringify(error)}`)
            })
    }

    @Logger.LogFunction()
    static Start(jobName: string, userToken?: TUserTokenInfo): TInternalResponse<TJson> {
        Roles.CheckPermission(userToken, undefined, PERMISSION.ADMIN)

        const jobKey = _.findKey(this.Jobs, ["name", jobName])
        if (jobKey) {
            this.Jobs[Number(jobKey)].cronJob.start()
            return HttpResponse.Ok({ message: `Job '${jobName}' started` })
        }
        throw new HttpErrorNotFound(`Job '${jobName}' not found`)
    }

    @Logger.LogFunction()
    static Stop(jobName: string, userToken?: TUserTokenInfo): TInternalResponse<TJson> {
        Roles.CheckPermission(userToken, undefined, PERMISSION.ADMIN)

        const jobKey = _.findKey(this.Jobs, ["name", jobName])
        if (jobKey) {
            const _jobKey = parseInt(jobKey, 10)
            this.Jobs[_jobKey].cronJob.stop()
            return HttpResponse.Ok({ message: `Job '${jobName}' stopped` })
        }
        throw new HttpErrorNotFound(`Job '${jobName}' not found`)
    }

    @Logger.LogFunction()
    static StartAll() {
        for (const job of this.Jobs) {
            job.cronJob.start()
        }
    }


    @Logger.LogFunction()
    static StopAll() {
        for (const job of this.Jobs) {
            job.cronJob.stop()
        }
    }
}