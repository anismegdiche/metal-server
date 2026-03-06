//
//
//
import type { TJson } from "../../types/TJson"
import type { U_config_plans_plan_entity_run_ai_Params } from "./types/U_config_plans_plan_entity_run_ai_Params"

export type TAiArguments = {
	data: string // Buffer<ArrayBufferLike>
} & U_config_plans_plan_entity_run_ai_Params

export type TAiOutput = TJson | object | null
