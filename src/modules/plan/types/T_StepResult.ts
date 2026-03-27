//
//
//
import type { DataTable } from "../../../types/DataTable"
import type { TContext } from "../../sandbox/types/TContext"
import type { STEP_OUTCOME, STEP_SIGNAL } from "../Step"


//
export type T_StepResult = {
    data?: DataTable
    signal: STEP_SIGNAL
    outcome: STEP_OUTCOME
    $context: TContext
}