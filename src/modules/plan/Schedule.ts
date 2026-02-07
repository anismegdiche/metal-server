//
//
//
import { CronJob } from 'cron'
import { findKey } from 'lodash-es'
//
import type { TJson } from "../../types/TJson"
import { Logger } from '../../utils/Logger'
import { AUTH_PERMISSION } from '../auth/@consts'
import type { TUserTokenInfo } from '../auth/@types'
import { Roles } from '../auth/Roles'
import { ConfigManager } from '../core/ConfigManager'
import { HttpResponse } from "../core/HttpResponse"
import { HttpErrorInternalServerError, HttpErrorNotFound, NormalizeError } from "../errors/HttpErrors"
import type { TInternalResponse } from '../core/types/TInternalResponse'
import { Plans } from "./Plans"
import type { TSchedule } from './types/TSchedule'
import type { U_config_schedules, U_config_schedules_schedule } from './types/U_config_schedules'

//
const ON_START = '@start'


//
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

        const scheduleConfig: Array<[string, U_config_schedules_schedule]> = Object.entries(ConfigManager.Get<U_config_schedules>('schedules'))

        for (const [_jobName, _scheduleParams] of scheduleConfig) {
            Logger.Info(`${Logger.In} Schedule.CreateAndStartAll: Creating and Starting job '${_jobName}'`)

            const _currentDate = new Date()
            _currentDate.setSeconds(_currentDate.getSeconds() + 1)
            const _cron = (_scheduleParams.cron === ON_START)
                ? _currentDate
                : _scheduleParams.cron

            const _timezone = ConfigManager.Get<string>('server.timezone')
            const _cronJob = new CronJob(
                _cron,
                Schedule.JobProcess.bind(this, _jobName, _scheduleParams),
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

    static JobProcess(jobName: string, scheduleParams: U_config_schedules_schedule) {
        Logger.Info(`${Logger.In} Schedule.JobProcess: Running job '${jobName}'`)

        const { plan } = scheduleParams

        Plans.Plans.get(plan)?.ProcessSchedule(scheduleParams)
            .then(() => {
                Logger.Info(`${Logger.Out} Schedule.JobProcess: job '${jobName}' terminated`)
            })
            .catch((e) => {
                const _e = NormalizeError(e)
                throw new HttpErrorInternalServerError(`Unable to process scheduled job '${jobName}': ${_e.message} `)
            })
    }

    @Logger.LogFunction()
    static Start(jobName: string, userToken?: TUserTokenInfo): TInternalResponse<TJson> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

        const jobKey = findKey(this.Jobs, ["name", jobName])

        if (jobKey) {
            this.Jobs[Number(jobKey)]!.cronJob.start()
            return HttpResponse.Ok({ message: `Job '${jobName}' started` })
        }

        throw new HttpErrorNotFound(`Job '${jobName}' not found`)
    }

    @Logger.LogFunction()
    static Stop(jobName: string, userToken?: TUserTokenInfo): TInternalResponse<TJson> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

        const jobKey = findKey(this.Jobs, ["name", jobName])

        if (jobKey) {
            const _jobKey = Number.parseInt(jobKey, 10)
            this.Jobs[_jobKey]!.cronJob.stop()
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