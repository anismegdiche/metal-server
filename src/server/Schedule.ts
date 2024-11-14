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
import { Plan } from './Plan'
import { JsonHelper } from '../lib/JsonHelper'
import { HttpResponse } from "./HttpResponse"
import { HttpErrorForbidden, HttpErrorNotFound } from "./HttpErrors"
import { TJson } from "../types/TJson"
import { PERMISSION, Roles } from "./Roles"
import { TUserTokenInfo } from "./User"

export type TScheduleConfig = {
    plan: string
    entity: string
    cron: string
}

export class Schedule {

    static Jobs: TSchedule[] = []

    @Logger.LogFunction()
    static async CreateAndStartAll() {
        if (!Config.Configuration?.schedules) {
            return undefined
        }

        const scheduleConfig: Array<[string, TScheduleConfig]> = Object.entries(Config.Configuration.schedules)

        for (const [_schedule, _scheduleParams] of scheduleConfig) {
            Logger.Info(`${Logger.In} Schedule.CreateAndStartAll: Creating and Starting job '${_schedule}'`)
            const currentDate = new Date()
            currentDate.setSeconds(currentDate.getSeconds() + 1)
            this.Jobs.push(<TSchedule>{
                schedule: _schedule,
                cronJob: new CronJob(
                    (_scheduleParams.cron === '@start')
                        ? currentDate
                        : _scheduleParams.cron,
                    () => {
                        Logger.Debug(`${Logger.In} Schedule.CreateAndStartAll: Running job '${_schedule}'`)
                        Plan.Process(_scheduleParams)
                            .then(() => {
                                Logger.Debug(`${Logger.Out} Schedule.CreateAndStartAll: job '${_schedule}' terminated`)
                            })
                            .catch((error) => {
                                Logger.Error(`${Logger.Out} Schedule.CreateAndStartAll: Error has occured with '${_schedule}' : ${JsonHelper.Stringify(error)}`)
                            })
                    },
                    null,
                    true,
                    Config.Configuration?.server?.timezone as string ?? Config.DEFAULTS['server.timezone']
                )
            })
        }
    }

    @Logger.LogFunction()
    static Start(jobName: string, userToken: TUserTokenInfo | undefined = undefined): TInternalResponse<TJson> {
        if (!Roles.HasPermission(userToken, undefined, PERMISSION.ADMIN))
            throw new HttpErrorForbidden('Permission denied')

        const jobKey = _.findKey(this.Jobs, ["name", jobName])
        if (jobKey) {
            this.Jobs[Number(jobKey)].cronJob.start()
            return HttpResponse.Ok({ message: `Job '${jobName}' started` })
        }
        throw new HttpErrorNotFound(`Job '${jobName}' not found`)
    }

    @Logger.LogFunction()
    static Stop(jobName: string, userToken: TUserTokenInfo | undefined = undefined): TInternalResponse<TJson> {
        if (!Roles.HasPermission(userToken, undefined, PERMISSION.ADMIN))
            throw new HttpErrorForbidden('Permission denied')

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