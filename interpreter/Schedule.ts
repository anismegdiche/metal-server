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


export abstract class Schedule {

    public static Jobs: TSchedule[] = []

    public static CreateAndStart() {
        Logger.Debug(`${Logger.In} Schedule.Start: ${JSON.stringify(Config.Configuration.schedules)}`)
        if (Config.Configuration?.schedules) {
            for (const _scheduleConfig of Config.Configuration.schedules) {
                const __schedule = Object.keys(_scheduleConfig)[0]
                const
                    __jobName = __schedule,
                    __planName = _scheduleConfig[__schedule].plan,
                    __entityName = _scheduleConfig[__schedule].entity,
                    __cron = _scheduleConfig[__schedule].cron

                Logger.Info(`${Logger.In} Schedule.Start: Starting job '${__jobName}'`)
                this.Jobs.push(<TSchedule>{
                    name: __jobName,
                    job: new CronJob(
                        __cron,
                        () => {
                            Logger.Debug(`${Logger.In} Schedule.Start: Running job '${__jobName}'`)
                            try {
                                Plans.RenderTable(__planName, __entityName)
                            } catch (error) {
                                Logger.Error(`${Logger.In} Schedule.Start: Error has occured with '${__jobName}' : ${JSON.stringify(error)}`)
                            }
                        },
                        null,
                        true,
                        Config.Configuration.server.timezone || 'UTC'
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