//
//
//
import type { DataTable } from "../../../types/DataTable"
import type { U__plans_plan__step_Params } from "./U__plans_plan__step"

//
export type TStep = {
	currentSchemaName: string
	currentPlanName: string
	currentDataTable: DataTable
	stepArgs: U__plans_plan__step_Params
}
