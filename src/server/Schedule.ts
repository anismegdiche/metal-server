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
import { TSchemaRequest } from '../types/TSchemaRequest'
import { Server } from './Server'

type TScheduleConfig = {
    plan: string
    entity: string
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
                    name: _scheduleName,
                    job: new CronJob(
                        _scheduleParams.cron,
                        () => {
                            Logger.Debug(`${Logger.In} Schedule.Start: Running job '${_scheduleName}'`)
                            try {
                                Server.Plan.GetData(<TSchemaRequest>{
                                    source: _scheduleParams.plan,
                                    entity: _scheduleParams.entity
                                })
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

    public static Start(jobName: string) {
        const _jobKey = _.findKey(this.Jobs, ["name", jobName])
        if (_jobKey) {
            this.Jobs[Number(_jobKey)].job.start()
            return <TInternalResponse>{
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: { message: `Job '${jobName}' started` }
            }
        }
        return <TInternalResponse>{
            StatusCode: HTTP_STATUS_CODE.NOT_FOUND,
            Body: { message: `Job '${jobName}' not found` }
        }
    }

    public static Stop(jobName: string) {
        const _jobKey = _.findKey(this.Jobs, ["name", jobName])
        if (_jobKey) {
            const __jobKey = parseInt(_jobKey, 10)
            this.Jobs[__jobKey].job.stop()
            return <TInternalResponse>{
                StatusCode: HTTP_STATUS_CODE.OK,
                Body: { message: `Job '${jobName}' stopped` }
            }
        }
        return <TInternalResponse>{
            StatusCode: HTTP_STATUS_CODE.NOT_FOUND,
            Body: { message: `Job '${jobName}' not found` }
        }
    }

    public static StartAll() {
        for (const _job of this.Jobs) {
            _job.job.start()
        }
    }


    public static StopAll() {
        for (const _job of this.Jobs) {
            _job.job.stop()
        }
    }
}