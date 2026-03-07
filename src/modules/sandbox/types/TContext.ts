//
//
//
import type { DataTable } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
import type { TAiOutput } from "../../ai-engine/@types"
import type { STEP, STEP_STATUS } from "../../plan/@consts"
import type { U__plans_plan__step_Params } from "../../plan/types/U__plans_plan__step"
import type { TSchemaRequest } from "../../schema/types/TSchemaRequest"

//
export type TContext = {
	$entity?: string // requested entity name
	$schema?: string // requested schema name
	$options: Omit<TSchemaRequest, "schema" | "entity" | "source">
	$request?: {
		"data-path"?: string // requested JSON path, if undefined will return the whole JSON
	}
	$row?: TJson
	$response?: {
		url?: string
		host?: string
		body?: TJson
	}
	$plan: {
		name: string
		schema?: string
		entity: string
		$current: {
			stepIndex?: number
			stepCommand?: STEP
			stepArgs?: U__plans_plan__step_Params
			data?: DataTable
			status?: STEP_STATUS
		}
	}
	$result?: TAiOutput
	$utils?: TJson
	$vars: TJson
}
