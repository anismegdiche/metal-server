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