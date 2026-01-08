//
//
//
import type { U_config_plans_plan_entity_run_ai_Params } from "./types/U_config_plans_plan_entity_run_ai_Params"


export type TAiRunArguments = {
    data: string // Buffer<ArrayBufferLike>
} & U_config_plans_plan_entity_run_ai_Params

export type TAiRunOutput = void | object | string | undefined