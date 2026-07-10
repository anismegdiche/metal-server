//
//
//
import type { TJson } from "../../types/TJson"
import type { U__plans_plan_run_ai_Params } from "./types/U__plans_plan_run_ai_Params"

export type TAiArguments = {
	data: string // Buffer<ArrayBufferLike>
} & U__plans_plan_run_ai_Params

export type TAiOutput = TJson | object | null
