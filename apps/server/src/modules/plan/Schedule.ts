//
//
//
import { _MTR_ } from "@metal/config"
import { Logger } from "@metal/logger"
import { CronJob } from "cron"
import { findKey } from "lodash-es"
//
import type { TJson } from "@metal/types"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { ConfigManager } from "../core/ConfigManager"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { HttpErrorInternalServerError, HttpErrorNotFound, NormalizeError } from "../errors/HttpErrors"
import { MetricsCollector } from "../metrics/MetricsCollector"
import { Plans } from "./Plans"
import type { TSchedule } from "./types/TSchedule"
import type { U__schedules, U__schedules_schedule } from "./types/U__schedules"

//
const ON_START = "@start"

//
export class Schedule {
	static Jobs: TSchedule[] = []

	@Logger.LogFunction()
	static async Init() {
		if (ConfigManager.Has("schedules")) Schedule.CreateAndStartAll()
	}

	@Logger.LogFunction()
	static async CreateAndStartAll() {
		if (!ConfigManager.Has("schedules")) {
			return undefined
		}

		const scheduleConfig: [string, U__schedules_schedule][] = Object.entries(ConfigManager.Get<U__schedules>("schedules"))

		// metrics schedules
		MetricsCollector.DispatchEvent_set(
			_MTR_.SCHEDULES,
			scheduleConfig.map(([jobName]) => jobName),
		)
		MetricsCollector.DispatchEvent_set(_MTR_.SCHEDULES_TOTAL, scheduleConfig.length)

		// metrics schedules active (we'll increment per active cron job)
		MetricsCollector.DispatchEvent_set(_MTR_.SCHEDULES_ACTIVE, 0)

		const _timezone = ConfigManager.Get<string>("server.timezone")

		const details: Record<
			string,
			{
				plan: string
				cron: string
				status: "active" | "completed"
				lastFire: string | null
				nextFire: string | null
			}
		> = {}

		for (const [_jobName, _scheduleParams] of scheduleConfig) {
			Logger.Info(`${Logger.In} Schedule.CreateAndStartAll: Creating job '${_jobName}'`)

			const isOnStart = _scheduleParams.cron === ON_START
			const hasCronExpression = _scheduleParams.cron && _scheduleParams.cron !== ON_START

			// 1) If ON_START: run once immediately on server start
			if (isOnStart) {
				Logger.Info(`${Logger.In} Schedule.CreateAndStartAll: Running ON_START job '${_jobName}'`)
				try {
					await Schedule.JobProcess(_jobName, _scheduleParams)
				} catch (e) {
					const _e = NormalizeError(e)
					Logger.Error(`${Logger.Out} Error in ON_START job '${_jobName}': ${_e.message}`)
				}
			}

			// 2) If there is a real cron expression, create and start a CronJob
			let _cronJob: CronJob | undefined

			if (hasCronExpression) {
				Logger.Info(
					`${Logger.In} Schedule.CreateAndStartAll: Starting cron job '${_jobName}' with expression '${_scheduleParams.cron}'`,
				)

				_cronJob = new CronJob(
					// cronTime
					_scheduleParams.cron,
					// onTick
					async () => {
						try {
							await Schedule.JobProcess(_jobName, _scheduleParams)
						} catch (e) {
							const _e = NormalizeError(e)
							Logger.Error(`${Logger.Out} Error in job '${_jobName}': ${_e.message}`)
						}
					},
					// onComplete
					null,
					// start
					true, // start the scheduler immediately
					// timeZone
					_timezone,
					// context
					null,
					// runOnInit
					false, // we already handled ON_START manually above
					// utcOffset
					null,
					// unrefTimeout
					true,
					// waitForCompletion
					true,
					// errorHandler
					(e: unknown) => {
						const _e = NormalizeError(e)
						Logger.Error(`${Logger.Out} Error in job '${_jobName}': ${_e.message}`)
					},
					// name
					_jobName,
					// threshold
					10000,
				)
			}

			// 3) Register job (even ON_START-only jobs, with cronJob undefined)
			Schedule.Jobs.push(<TSchedule>{
				name: _jobName,
				cron: _scheduleParams.cron,
				cronJob: _cronJob,
			})

			// 4) Build metrics detail
			const nextFire = _cronJob ? (_cronJob.nextDate()?.toISO() ?? null) : null
			details[_jobName] = {
				plan: _scheduleParams.plan,
				cron: _scheduleParams.cron,
				status: isOnStart ? "completed" : "active",
				lastFire: isOnStart ? new Date().toISOString() : null,
				nextFire,
			}
		}

		MetricsCollector.DispatchEvent_set(_MTR_.SCHEDULES_DETAILS, details)
	}

	static async JobProcess(jobName: string, scheduleParams: U__schedules_schedule) {
		Logger.Info(`${Logger.In} Schedule.JobProcess: Running job '${jobName}'`)

		// metrics schedules active inc
		const _mtr_schedules_active: number = MetricsCollector.Get(_MTR_.SCHEDULES_ACTIVE, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.SCHEDULES_ACTIVE, _mtr_schedules_active + 1)

		// update lastFire
		const details = MetricsCollector.Get(_MTR_.SCHEDULES_DETAILS, {}) as any
		if (details[jobName]) {
			const job = Schedule.Jobs.find((j) => j.name === jobName)
			MetricsCollector.DispatchEvent_update(_MTR_.SCHEDULES_DETAILS, {
				[jobName]: {
					lastFire: new Date().toISOString(),
					nextFire: job?.cronJob ? (job.cronJob.nextDate()?.toISO() ?? null) : null,
				},
			})
		}

		const { plan } = scheduleParams

		await Plans.get(plan)
			?.ProcessSchedule(scheduleParams)
			.then(() => {
				Logger.Info(`${Logger.Out} Schedule.JobProcess: job '${jobName}' terminated`)

				// metrics schedules active dec
				const _mtr_schedules_active: number = MetricsCollector.Get(_MTR_.SCHEDULES_ACTIVE, 0)
				MetricsCollector.DispatchEvent_set(_MTR_.SCHEDULES_ACTIVE, _mtr_schedules_active - 1)
			})
			.catch((e: unknown) => {
				const _e = NormalizeError(e)
				throw new HttpErrorInternalServerError(`Unable to process scheduled job '${jobName}': ${_e.message} `)
			})
	}

	@Logger.LogFunction()
	static Start(jobName: string, userToken?: TUserTokenInfo): TInternalResponse<TJson> {
		Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

		const jobKey = findKey(Schedule.Jobs, ["name", jobName])

		if (jobKey) {
			Schedule.Jobs[Number(jobKey)]?.cronJob.start()
			return HttpResponse.Ok({ message: `Job '${jobName}' started` })
		}

		throw new HttpErrorNotFound(`Job '${jobName}' not found`)
	}

	@Logger.LogFunction()
	static Stop(jobName: string, userToken?: TUserTokenInfo): TInternalResponse<TJson> {
		Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

		const jobKey = findKey(Schedule.Jobs, ["name", jobName])

		if (jobKey) {
			const _jobKey = Number.parseInt(jobKey, 10)
			Schedule.Jobs[_jobKey]?.cronJob.stop()
			return HttpResponse.Ok({ message: `Job '${jobName}' stopped` })
		}

		throw new HttpErrorNotFound(`Job '${jobName}' not found`)
	}

	@Logger.LogFunction()
	static StartAll() {
		for (const job of Schedule.Jobs) {
			if (job.cronJob) job.cronJob.start()
		}
	}

	@Logger.LogFunction()
	static StopAll() {
		for (const job of Schedule.Jobs) {
			if (job.cronJob) job.cronJob.stop()
		}
		Schedule.Jobs = []
	}
}
