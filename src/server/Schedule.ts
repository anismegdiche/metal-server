//
//
//
//
//
import { CronJob } from 'cron'
import _ from 'lodash'

import { HTTP_STATUS_CODE } from '../lib/Const'
import { TInternalResponse } from '../types/TInternalResponse'
import { TSchedule } from '../types/TSchedule'
import { Logger } from '../utils/Logger'
import { Config } from './Config'
import { Plan } from './Plan'
import { JsonHelper } from '../lib/JsonHelper'

export type TScheduleConfig = {
    planName: string
    entityName: string
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

        for (const [_scheduleName, _scheduleParams] of scheduleConfig) {
            Logger.Info(`${Logger.In} Schedule.CreateAndStartAll: Creating and Starting job '${_scheduleName}'`)
            const currentDate = new Date()
            currentDate.setSeconds(currentDate.getSeconds() + 1)
            this.Jobs.push(<TSchedule>{
                scheduleName: _scheduleName,
                cronJob: new CronJob(
                    (_scheduleParams.cron === '@start')
                        ? currentDate
                        : _scheduleParams.cron,
                    () => {
                        Logger.Debug(`${Logger.In} Schedule.CreateAndStartAll: Running job '${_scheduleName}'`)
                        Plan.Process(_scheduleParams)
                            .then(() => {
                                Logger.Debug(`${Logger.Out} Schedule.CreateAndStartAll: job '${_scheduleName}' terminated`)
                            })
                            .catch((error) => {
                                Logger.Error(`${Logger.Out} Schedule.CreateAndStartAll: Error has occured with '${_scheduleName}' : ${JsonHelper.Stringify(error)}`)
                            })
                    },
                    null,
                    true,
                    Config.Configuration?.server?.timezone ?? Config.DEFAULTS['server.timezone']
                )
            })
        }
    }

    @Logger.LogFunction()
    static Start(jobName: string): TInternalResponse {
        const _jobKey = _.findKey(this.Jobs, ["name", jobName])
        if (_jobKey) {
            this.Jobs[Number(_jobKey)].cronJob.start()
            return {
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: { message: `Job '${jobName}' started` }
            }
        }
        return {
            StatusCode: HTTP_STATUS_CODE.NOT_FOUND,
            Body: { message: `Job '${jobName}' not found` }
        }
    }

    @Logger.LogFunction()
    static Stop(jobName: string): TInternalResponse {
        const _jobKey = _.findKey(this.Jobs, ["name", jobName])
        if (_jobKey) {
            const __jobKey = parseInt(_jobKey, 10)
            this.Jobs[__jobKey].cronJob.stop()
            return {
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: { message: `Job '${jobName}' stopped` }
            }
        }
        return {
            StatusCode: HTTP_STATUS_CODE.NOT_FOUND,
            Body: { message: `Job '${jobName}' not found` }
        }
    }

    @Logger.LogFunction()
    static StartAll() {
        for (const _job of this.Jobs) {
            _job.cronJob.start()
        }
    }


    @Logger.LogFunction()
    static StopAll() {
        for (const _job of this.Jobs) {
            _job.cronJob.stop()
        }
    }
}