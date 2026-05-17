//
//
//
import type { DataTable } from "../../../types/DataTable"
import type { TContext } from "../../sandbox/types/TContext"
import type { STEP_OUTCOME, STEP_SIGNAL } from "../@consts"


//
export type T_StepMetrics = {
    rows: {
		input: number
        passed: number
        skipped: number
        sunk: number
		failed: number
	},
    step: {
		startTime?: Date
		endTime?: Date
		durationMs?: number
		status?: string
	},
    attemptCount: number
}

export type T_StepResult = {
    data?: DataTable
    signal: STEP_SIGNAL
    outcome: STEP_OUTCOME
    $context: TContext
    error?: Error
    metrics: T_StepMetrics
}

export type T_PlanStepEntry = {
	index: number
	command: string
	status: string
	outcome?: STEP_OUTCOME
	durationMs?: number
	metrics?: T_StepMetrics
	error?: {
		message: string
		timestamp: string
	}
}

export type T_PlanMetrics = {
	startTime: Date
	endTime?: Date
	durationMs?: number
	status: "success" | "failed" | "completed_with_errors"
	steps: T_PlanStepEntry[]
}