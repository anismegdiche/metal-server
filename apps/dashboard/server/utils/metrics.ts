import { MetricsGetDataPath } from "@metal/config"
import { PersistentMap } from "@metal/persistent-map"

export interface StepRowsMetrics {
	input?: number
	passed?: number
	skipped?: number
	sunk?: number
	failed?: number
}

export interface StepMetrics {
	planName: string
	index: number
	step?: {
		startTime?: string
		endTime?: string
		durationMs?: number
		status?: string
	}
	rows?: StepRowsMetrics
	attemptCount?: number
}

export interface PlanMetrics {
	planName: string
	startTime?: string
	endTime?: string
	durationMs?: number
	status: string
	steps: StepMetrics[]
}

const db = new PersistentMap<PlanMetrics>(MetricsGetDataPath())

export function getPlanMetrics(planName: string): PlanMetrics | null {
	const metricKey = `plan:${planName}:metrics`
	if (!db.has(metricKey)) return null
	return db.get(metricKey)
}

export interface PlanSummary {
	name: string
	status: string
	startTime?: string
	endTime?: string
	durationMs?: number
	stepCount: number
}

export function getAllPlans(): PlanSummary[] {
	const entries = db.entries()
	const plans: PlanSummary[] = []

	for (const [key, value] of entries) {
		if (key.startsWith("plan:") && key.endsWith(":metrics")) {
			const metrics = value as PlanMetrics
			plans.push({
				name: metrics.planName,
				status: metrics.status,
				startTime: metrics.startTime,
				endTime: metrics.endTime,
				durationMs: metrics.durationMs,
				stepCount: metrics.steps?.length ?? 0,
			})
		}
	}

	return plans
}
