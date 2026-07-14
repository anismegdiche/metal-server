//
//
//
import type { CronJob } from "cron"

//
export type TSchedule = {
	name: string
	cron: string | Date
	cronJob: CronJob
}
