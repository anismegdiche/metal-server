//
//
//
import type { DataTable } from "../../../types/DataTable"
import type { TContext } from "../../sandbox/types/TContext"
import type { STEP_OUTCOME, STEP_SIGNAL, STEP_STATUS } from "../@consts"


//
export type T_StepRowsMetrics = {
	input: number
	passed: number
	skipped: number
	sunk: number
	failed: number
}

export type T_StepMetrics = {
	planName: string
	index: number
	rows?: {
		input?: number
		passed?: number
		skipped?: number
		sunk?: number
		failed?: number
	},
	step?: {
		startTime?: Date
		endTime?: Date
		durationMs?: number
		status?: STEP_STATUS
	},
	attemptCount?: number
}

export type T_StepResult = {
	data?: DataTable
	signal: STEP_SIGNAL
	outcome: STEP_OUTCOME
	$context: TContext
	error?: Error
}