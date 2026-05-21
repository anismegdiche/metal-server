/** biome-ignore-all lint/complexity/noStaticOnlyClass: false positive */
//
//
//
import { type CustomEvent, EventBus, type IEvent, on } from "@dimkl/events";
import { merge } from "lodash-es";
import { JsonUtils } from "../../../utils/JsonUtils";
import type { PLAN_STATUS } from "../@consts";
//
import type { T_StepMetrics } from "../types/T_StepResult";
//


//
export enum PLAN_METRICS {
    PLAN_START = "plan:metrics:start",
    PLAN_END = "plan:metrics:end",
    STEP_START = "plan:metrics:step:start",
    STEP_END = "plan:metrics:step:end",
    STEP_INC = "plan:metrics:step:inc"
}


//
declare global {

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
        [PLAN_METRICS.PLAN_START]: PlanStart
        [PLAN_METRICS.PLAN_END]: PlanEnd

        [PLAN_METRICS.STEP_START]: StepStart
        [PLAN_METRICS.STEP_END]: StepEnd
        [PLAN_METRICS.STEP_INC]: StepInc
    }
}

export type T_PlanMetrics = {
    planName: string
    startTime: Date
    endTime?: Date
    durationMs?: number
    status: PLAN_STATUS
    steps: T_StepMetrics[]
}


export class PlanMetrics {

    static Bus = new EventBus()

    static Metrics: Map<string, T_PlanMetrics | undefined> = new Map()

    @on({ eventName: PLAN_METRICS.STEP_START, eventBus: PlanMetrics.Bus })
    static _handlePlanStepStart(event: CustomEvent<Partial<T_StepMetrics>>) {

        const metrics = event.data || {}
        const planName = metrics.planName || ""
        const stepIndex = metrics.index || 0

        // get old metrics
        const planMetrics: T_PlanMetrics | undefined = PlanMetrics.Metrics.get(planName)

        if (!planMetrics) {
            return
        }

        // update metrics
        planMetrics.steps[stepIndex] = merge(
            planMetrics.steps[stepIndex],
            metrics
        )

        // save metrics
        PlanMetrics.Metrics.set(planName, planMetrics)
    }

    @on({ eventName: PLAN_METRICS.STEP_END, eventBus: PlanMetrics.Bus })
    static _handlePlanStepEnd(event: CustomEvent<Partial<T_StepMetrics>>) {

        const metrics = event.data ?? {}
        const planName = metrics.planName ?? ""
        const stepIndex = metrics.index ?? 0
        const stepEndTime = metrics.step?.endTime

        // get old metrics
        const planMetrics: T_PlanMetrics | undefined = PlanMetrics.Metrics.get(planName)

        if (!planMetrics) {
            return
        }

        const stepMetrics = planMetrics.steps[stepIndex]

        if (!stepMetrics) {
            return
        }

        const startTime = stepMetrics.step?.startTime

        if (!startTime || !stepEndTime) {
            return
        }

        const durationMs = stepEndTime.getTime() - startTime.getTime()

        metrics.step!.durationMs = durationMs

        // update metrics
        planMetrics.steps[stepIndex] = merge(
            planMetrics.steps[stepIndex],
            metrics
        )

        // save metrics
        PlanMetrics.Metrics.set(planName, planMetrics)
    }

    @on({ eventName: PLAN_METRICS.STEP_INC, eventBus: PlanMetrics.Bus })
    static _handlePlanStepInc(event: CustomEvent<Partial<T_StepMetrics>>) {

        const metrics = event.data || {}
        const planName = metrics.planName || ""
        const stepIndex = metrics.index || 0

        // get old metrics
        const planMetrics: T_PlanMetrics | undefined = PlanMetrics.Metrics.get(planName)

        if (!planMetrics) {
            return
        }

        const stepMetrics = planMetrics.steps[stepIndex]

        if (!stepMetrics) {
            return
        }

        for (const key in metrics.rows) {
            JsonUtils.Set(
                stepMetrics,
                `rows.${key}`,
                JsonUtils.Get(stepMetrics, `rows.${key}`, 0) + JsonUtils.Get(metrics, `rows.${key}`, 0)
            )
        }

        // update metrics
        planMetrics.steps[stepIndex] = merge(
            planMetrics.steps[stepIndex],
            metrics
        )

        // save metrics
        PlanMetrics.Metrics.set(planName, planMetrics)
    }
    
    @on({ eventName: PLAN_METRICS.PLAN_START, eventBus: PlanMetrics.Bus })
    static _handlePlanStart(event: CustomEvent<Partial<T_PlanMetrics>>) {

        const metrics = event.data ?? {}
        const planName = metrics.planName ?? ""

        // get old metrics
        let planMetrics: T_PlanMetrics | undefined = PlanMetrics.Metrics.get(planName)

        if (!planMetrics) {
            return
        }

        // update metrics
        planMetrics = merge(
            planMetrics,
            metrics
        )

        // save metrics
        PlanMetrics.Metrics.set(planName, planMetrics)
    }
    
    @on({ eventName: PLAN_METRICS.PLAN_END, eventBus: PlanMetrics.Bus })
    static _handlePlanEnd(event: CustomEvent<Partial<T_PlanMetrics>>) {

        const metrics = event.data ?? {}
        const planName = metrics.planName ?? ""
        const planEndTime = metrics.endTime ?? new Date()

        // get old metrics
        let planMetrics: T_PlanMetrics | undefined = PlanMetrics.Metrics.get(planName)

        if (!planMetrics) {
            return
        }

        const startTime = planMetrics.startTime

        const durationMs = planEndTime.getTime() - startTime.getTime()

        metrics.durationMs = durationMs

        // update metrics
        planMetrics = merge(
            planMetrics,
            metrics
        )

        // save metrics
        PlanMetrics.Metrics.set(planName, planMetrics)
    }
    
}
