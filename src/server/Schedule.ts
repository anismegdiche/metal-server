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
import { Logger } from '../lib/Logger'
import { Config } from './Config'
import { Plan } from './Plan'

export type TScheduleConfig = {
    planName: string
    entityName: string
    cron: string
}

export class Schedule {

    public static Jobs: TSchedule[] = []

    public static CreateAndStartAll() {
        Logger.Debug(`${Logger.In} Schedule.CreateAndStartAll: ${JSON.stringify(Config.Configuration.schedules)}`)
        if (Config.Configuration?.schedules) {

            const scheduleConfig: Array<[string, TScheduleConfig]> = Object.entries(Config.Configuration.schedules)

            for (const [_scheduleName, _scheduleParams] of scheduleConfig) {
                Logger.Info(`${Logger.In} Schedule.CreateAndStartAll: Creating and Starting job '${_scheduleName}'`)
                this.Jobs.push(<TSchedule>{
                    scheduleName: _scheduleName,
                    cronJob: new CronJob(
                        _scheduleParams.cron,
                        () => {
                            Logger.Debug(`${Logger.In} Schedule.Start: Running job '${_scheduleName}'`)
                            try {
                                Plan.Process(_scheduleParams)
                            } catch (error) {
                                Logger.Error(`${Logger.In} Schedule.Start: Error has occured with '${_scheduleName}' : ${JSON.stringify(error)}`)
                            }
                            Logger.Debug(`${Logger.Out} Schedule.Start: job '${_scheduleName}' terminated`)
                        },
                        null,
                        true,
                        Config.Configuration?.server?.timezone || Config.DEFAULTS['server.timezone']
                    )
                })
            }
        }
        return undefined
    }

    public static Start(jobName: string): TInternalResponse {
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

    public static Stop(jobName: string):TInternalResponse {
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

    public static StartAll() {
        for (const _job of this.Jobs) {
            _job.cronJob.start()
        }
    }


    public static StopAll() {
        for (const _job of this.Jobs) {
            _job.cronJob.stop()
        }
    }
}