import type { U__plans_plan__step_Params } from "./types/U__plans_plan__step"


export type T_StepErrorDetails = {
	message: string
	type: string
	timestamp: string
	attempt: number
	step?: {
		index?: number
		command?: string
		params?: U__plans_plan__step_Params
	}
}
