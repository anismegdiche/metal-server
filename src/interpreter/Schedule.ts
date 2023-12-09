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
import { Config } from '../server/Config'
import { Plans } from './Plans'

type TScheduleConfig = {
    plan: string
    entity: string
    cron: string
}

export class Schedule {

    public static Jobs: TSchedule[] = []

    public static CreateAndStart() {
        Logger.Debug(`${Logger.In} Schedule.Start: ${JSON.stringify(Config.Configuration.schedules)}`)
        if (Config.Configuration?.schedules) {

            const _configSchedule: Array<[string, TScheduleConfig]> = Object.entries(Config.Configuration.schedules)

            for (const [_scheduleName, _scheduleConfig] of _configSchedule) {
                Logger.Info(`${Logger.In} Schedule.Start: Starting job '${_scheduleName}'`)
                this.Jobs.push(<TSchedule>{
                    name: _scheduleName,
                    job: new CronJob(
                        _scheduleConfig.cron,
                        () => {
                            Logger.Debug(`${Logger.In} Schedule.Start: Running job '${_scheduleName}'`)
                            try {
                                Plans.RenderTable(undefined, _scheduleConfig.plan, _scheduleConfig.entity)
                            } catch (error) {
                                Logger.Error(`${Logger.In} Schedule.Start: Error has occured with '${_scheduleName}' : ${JSON.stringify(error)}`)
                            }
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