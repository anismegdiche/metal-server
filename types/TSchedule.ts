//
//
//
//
//
import { CronJob } from 'cron'

export type TSchedule = {
    name: string
    job: CronJob
}