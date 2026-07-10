//
//
//
import { type CustomEvent, EventBus, type IEvent, on } from "@dimkl/events"
import { _MTR_ } from "@metal/config"
import { merge } from "lodash-es"
import z from "zod"
//
import { Assert } from "../../utils/Assert"
import { JsonUtils } from "../../utils/JsonUtils"
import { Logger } from "../../utils/Logger"
import { MetricsCollector } from "../metrics/MetricsCollector"
import type { PLAN_STATUS, STEP_STATUS } from "./@consts"

//
export enum PLAN_METRICS {
	PLAN_SET = "plan:metrics:set",
	PLAN_START = "plan:metrics:start",
	PLAN_END = "plan:metrics:end",
	STEP_START = "plan:metrics:step:start",
	STEP_END = "plan:metrics:step:end",
	STEP_INC = "plan:metrics:step:inc",
}

//
export type T_StepRowsMetrics = {
	input?: number
	passed?: number
	skipped?: number
	sunk?: number
	failed?: number
}

export type T_StepMetrics = {
	planName: string
	index: number
	step?: {
		startTime?: Date
		endTime?: Date
		durationMs?: number
		status?: STEP_STATUS
	}
	rows?: T_StepRowsMetrics
	attemptCount?: number
}

export type T_PlanMetrics = {
	planName: string
	startTime?: Date
	endTime?: Date
	durationMs?: number
	status: PLAN_STATUS
	steps: T_StepMetrics[]
}

//
declare global {
	interface PlanSet extends IEvent {
		type: PLAN_METRICS.PLAN_SET
		data: Partial<T_PlanMetrics>
	}

	interface PlanStart extends IEvent {
		type: PLAN_METRICS.PLAN_START
		data: Partial<T_PlanMetrics>
	}

	interface PlanEnd extends IEvent {
		type: PLAN_METRICS.PLAN_END
		data: Partial<T_PlanMetrics>
	}

	interface StepStart extends IEvent {
		type: PLAN_METRICS.STEP_START
		data?: Partial<T_StepMetrics>
	}

	interface StepEnd extends IEvent {
		type: PLAN_METRICS.STEP_END
		data?: Partial<T_StepMetrics>
	}

	interface StepInc extends IEvent {
		type: PLAN_METRICS.STEP_INC
		data?: Partial<T_StepMetrics>
	}

	interface Events {
		[PLAN_METRICS.PLAN_SET]: PlanSet
		[PLAN_METRICS.PLAN_START]: PlanStart
		[PLAN_METRICS.PLAN_END]: PlanEnd
		[PLAN_METRICS.STEP_START]: StepStart
		[PLAN_METRICS.STEP_END]: StepEnd
		[PLAN_METRICS.STEP_INC]: StepInc
	}
}

//
export class PlanMetrics {
	static Bus = new EventBus()

	static Get(planName: string): T_PlanMetrics {
		const METRIC_NAME = _MTR_.PLAN + planName

		if (!MetricsCollector.Data.has(METRIC_NAME)) {
			Logger.Debug(`plan '${planName}' metrics not found`)
			return {} as T_PlanMetrics
		}
		return MetricsCollector.Data.get<T_PlanMetrics>(METRIC_NAME)
	}

	static Set(planName: string, planMetrics: T_PlanMetrics) {
		const METRIC_NAME = _MTR_.PLAN + planName
		Logger.Info(`Plan '${planName}' metrics: ${JsonUtils.Stringify(planMetrics)}`)
		MetricsCollector.Data.set<T_PlanMetrics>(METRIC_NAME, planMetrics)
	}

	@on({ eventName: PLAN_METRICS.PLAN_SET, eventBus: PlanMetrics.Bus })
	static _handlePlanSet(event: CustomEvent<Partial<T_PlanMetrics>>) {
		const metrics = (event.data || {}) as T_PlanMetrics
		const planName = metrics.planName || ""

		// save metrics
		PlanMetrics.Set(planName, metrics)
	}

	@on({ eventName: PLAN_METRICS.STEP_START, eventBus: PlanMetrics.Bus })
	static _handlePlanStepStart(event: CustomEvent<Partial<T_StepMetrics>>) {
		const metrics = event.data || {}
		const planName = metrics.planName || ""
		const stepIndex = metrics.index || 0

		// get old metrics
		const planMetrics = PlanMetrics.Get(planName)

		// update metrics
		planMetrics.steps[stepIndex] = merge(planMetrics.steps[stepIndex], metrics)

		// save metrics
		PlanMetrics.Set(planName, planMetrics)
	}

	@on({ eventName: PLAN_METRICS.STEP_END, eventBus: PlanMetrics.Bus })
	static _handlePlanStepEnd(event: CustomEvent<Partial<T_StepMetrics>>) {
		const metrics = event.data ?? {}
		const planName = metrics.planName ?? ""
		const stepIndex = metrics.index ?? 0

		// get old metrics
		const planMetrics = PlanMetrics.Get(planName)

		const stepMetrics = planMetrics.steps[stepIndex]

		if (!stepMetrics) return

		const startTime = Assert.ZodSchema<Date>(stepMetrics.step?.startTime, z.date(), "startTime is undefined")
		const stepEndTime = Assert.ZodSchema<Date>(metrics.step?.endTime, z.date(), "endTime is undefined")

		const durationMs = stepEndTime.getTime() - startTime.getTime()

		metrics.step!.durationMs = durationMs

		// update metrics
		planMetrics.steps[stepIndex] = merge(planMetrics.steps[stepIndex], metrics)

		// save metrics
		PlanMetrics.Set(planName, planMetrics)
	}

	@on({ eventName: PLAN_METRICS.STEP_INC, eventBus: PlanMetrics.Bus })
	static _handlePlanStepInc(event: CustomEvent<Partial<T_StepMetrics>>) {
		const metrics = event.data || {}
		const planName = metrics.planName || ""
		const stepIndex = metrics.index || 0

		// get old metrics
		const planMetrics = PlanMetrics.Get(planName)

		const stepMetrics = planMetrics.steps[stepIndex]

		if (!stepMetrics) {
			return
		}

		for (const key in metrics.rows) {
			JsonUtils.Set(
				stepMetrics,
				`rows.${key}`,
				JsonUtils.Get(stepMetrics, `rows.${key}`, 0) + JsonUtils.Get(metrics, `rows.${key}`, 0),
			)
		}

		// update metrics
		planMetrics.steps[stepIndex] = merge(planMetrics.steps[stepIndex], metrics)

		// save metrics
		PlanMetrics.Set(planName, planMetrics)
	}

	@on({ eventName: PLAN_METRICS.PLAN_START, eventBus: PlanMetrics.Bus })
	static _handlePlanStart(event: CustomEvent<Partial<T_PlanMetrics>>) {
		const metrics = event.data ?? {}
		const planName = metrics.planName ?? ""

		// get old metrics
		let planMetrics = PlanMetrics.Get(planName)

		// update metrics
		planMetrics = merge(planMetrics, metrics)

		// save metrics
		PlanMetrics.Set(planName, planMetrics)
	}

	@on({ eventName: PLAN_METRICS.PLAN_END, eventBus: PlanMetrics.Bus })
	static _handlePlanEnd(event: CustomEvent<Partial<T_PlanMetrics>>) {
		const metrics = event.data ?? {}
		const planName = metrics.planName ?? ""
		const planEndTime = metrics.endTime ?? new Date()

		// get old metrics
		let planMetrics = PlanMetrics.Get(planName)

		const startTime = Assert.ZodSchema<Date>(planMetrics.startTime, z.date(), "startTime is undefined")

		const durationMs = planEndTime.getTime() - startTime.getTime()

		metrics.durationMs = durationMs

		// update metrics
		planMetrics = merge(planMetrics, metrics)

		// save metrics
		PlanMetrics.Set(planName, planMetrics)
	}
}
