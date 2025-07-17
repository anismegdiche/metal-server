//
//
//
import { CronJob } from 'cron'
import _ from 'lodash'

import { TInternalResponse } from '../schema/types/TInternalResponse'
import { TSchedule } from './types/TSchedule'
import { Logger } from '../../utils/Logger'
import { JsonUtils } from '../../utils/JsonUtils'
import { HttpResponse } from "../core/HttpResponse"
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { TJson } from "../../types/TJson"
import { Plans } from "./Plans"
import { TScheduleConfig } from './types/TScheduleConfig'
import { AUTH_PERMISSION } from '../auth/@consts'
import { TUserTokenInfo } from '../auth/@types'
import { Roles } from '../auth/Roles'
import { ConfigManager } from '../core/ConfigManager'

export class Schedule {

    static Jobs: TSchedule[] = [] //NOSONAR

    @Logger.LogFunction()
    static async Init() {
        if (ConfigManager.Has('schedules'))
            Schedule.CreateAndStartAll()
    }

    @Logger.LogFunction()
    static async CreateAndStartAll() {
        if (!ConfigManager.Has('schedules')) {
            return undefined
        }

        const scheduleConfig: Array<[string, TScheduleConfig]> = Object.entries(ConfigManager.Get<TJson<TScheduleConfig>>('schedules'))

        for (const [_jobName, _scheduleParams] of scheduleConfig) {
            Logger.Info(`${Logger.In} Schedule.CreateAndStartAll: Creating and Starting job '${_jobName}'`)

            const _currentDate = new Date()
            _currentDate.setSeconds(_currentDate.getSeconds() + 1)
            const _cron = (_scheduleParams.cron === '@start')
                ? _currentDate
                : _scheduleParams.cron

            const _timezone = ConfigManager.Get<string>('server.timezone')
            const _cronJob = new CronJob(
                _cron,
                Schedule.Job.bind(this, _jobName, _scheduleParams),
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

    static Job(jobName: string, scheduleParams: TScheduleConfig) {
        Logger.Info(`${Logger.In} Schedule.Job: Running job '${jobName}'`)
        
        const { plan } = scheduleParams
        
        Plans.Plans.get(plan)?.ProcessScheduleConfig(scheduleParams)
            .then(() => {
                Logger.Info(`${Logger.Out} Schedule.Job: job '${jobName}' terminated`)
            })
            .catch((error) => {
                Logger.Error(`${Logger.Out} Schedule.Job: Error has occured with '${jobName}' : ${JsonUtils.Stringify(error)}`)
            })
    }

    @Logger.LogFunction()
    static Start(jobName: string, userToken?: TUserTokenInfo): TInternalResponse<TJson> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

        const jobKey = _.findKey(this.Jobs, ["name", jobName])
        if (jobKey) {
            this.Jobs[Number(jobKey)].cronJob.start()
            return HttpResponse.Ok({ message: `Job '${jobName}' started` })
        }
        throw new HttpErrorNotFound(`Job '${jobName}' not found`)
    }

    @Logger.LogFunction()
    static Stop(jobName: string, userToken?: TUserTokenInfo): TInternalResponse<TJson> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

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