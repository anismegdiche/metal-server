/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
//
//
//
import { type CustomEvent, EventBus, type IEvent, on } from "@dimkl/events";
import { merge } from "lodash-es";
import { JsonUtils } from "../../../utils/JsonUtils";
//
import type { T_StepMetrics } from "../types/T_StepResult";
//


//
export enum PLAN_METRICS {
    STEP_START = "plan:metrics:step:start",
    STEP_COMPLETE = "plan:metrics:step:complete",
    STEP_ROWS = "plan:metrics:step:rows"
}


//
declare global {
    interface StepStart extends IEvent {
        type: PLAN_METRICS.STEP_START
        data?: Partial<T_StepMetrics>
    }

    interface StepComplete extends IEvent {
        type: PLAN_METRICS.STEP_COMPLETE
        data?: Partial<T_StepMetrics>
    }

    interface StepRows extends IEvent {
        type: PLAN_METRICS.STEP_ROWS
        data?: Partial<T_StepMetrics>
    }

    interface Events {
        [PLAN_METRICS.STEP_START]: StepStart
        [PLAN_METRICS.STEP_COMPLETE]: StepComplete
        [PLAN_METRICS.STEP_ROWS]: StepRows
    }
}

export type T_PlanMetrics2 = {
    startTime: Date
    endTime?: Date
    durationMs?: number
    status: "success" | "failed" | "completed_with_errors"
    steps: T_StepMetrics[]
}


export class PlanMetrics {

    static Bus = new EventBus()

    static Metrics: Map<string, T_PlanMetrics2 | undefined> = new Map()

    @on({ eventName: PLAN_METRICS.STEP_START, eventBus: PlanMetrics.Bus })
    static _handlePlanStepStart(event: CustomEvent<Partial<T_StepMetrics>>) {

        const metrics = event.data || {}
        const planName = metrics.planName || ""
        const stepIndex = metrics.index || 0

        // get old metrics
        const planMetrics: T_PlanMetrics2 | undefined = PlanMetrics.Metrics.get(planName)

        // update metrics
        planMetrics!.steps[stepIndex] = merge(
            planMetrics!.steps[stepIndex],
            metrics
        )

        // save metrics
        PlanMetrics.Metrics.set(planName, planMetrics)
    }

    @on({ eventName: PLAN_METRICS.STEP_COMPLETE, eventBus: PlanMetrics.Bus })
    static _handlePlanStepComplete(event: CustomEvent<Partial<T_StepMetrics>>) {

        const metrics = event.data || {}
        const planName = metrics.planName || ""
        const stepIndex = metrics.index || 0
        const stepEndTime = metrics.step?.endTime

        // get old metrics
        const planMetrics: T_PlanMetrics2 | undefined = PlanMetrics.Metrics.get(planName)

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

    @on({ eventName: PLAN_METRICS.STEP_ROWS, eventBus: PlanMetrics.Bus })
    static _handlePlanStepRows(event: CustomEvent<Partial<T_StepMetrics>>) {

        const metrics = event.data || {}
        const planName = metrics.planName || ""
        const stepIndex = metrics.index || 0

        // get old metrics
        const planMetrics: T_PlanMetrics2 | undefined = PlanMetrics.Metrics.get(planName)

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
            planMetrics!.steps[stepIndex],
            metrics
        )

        // save metrics
        PlanMetrics.Metrics.set(planName, planMetrics)
    }
}
