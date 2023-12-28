//
//
//
//
//
import { CronJob } from 'cron'

export type TSchedule = {
    scheduleName: string
    cronJob: CronJob
}