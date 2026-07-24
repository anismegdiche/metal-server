//
//
//
import type { TJson } from "@metal/types"
import type { U__plans_plan_run_ai_Params } from "./types/U__plans_plan_run_ai_Params"

export type TAiArguments = {
	data: string // Buffer<ArrayBufferLike>
} & U__plans_plan_run_ai_Params

export type TAiOutput = TJson | object | null
