//
//
//
import z from "zod"
//
import { PLAN_FAILURE_STRATEGY, STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY } from "../@consts"
import { z_U__plans_plan__step } from "./U__plans_plan__step"
import { z_U__on_error_Params } from "./U__plans_plan_on_error"
import { z_U__failure_strategy_Params } from "./U__plans_plan_failure_strategy"


//
export const z_U__plans_plan__steps = z.array(
	z_U__plans_plan__step
)

export const z_U__plans_plan = z.object({
	steps: z_U__plans_plan__steps,
	"on-error": z_U__on_error_Params
		.default({
			strategy: STEP_ON_ERROR_STRATEGY.THROW,
			scope: STEP_ON_ERROR_SCOPE.STEP
		})
		.optional(),
	"failure-strategy": z_U__failure_strategy_Params
		.default(PLAN_FAILURE_STRATEGY.THROW)
		.optional()
})

export const z_U__plans = z.record(
	z.string("Plan name is required"),
	z_U__plans_plan
)

//
export type U__plans_plan__steps = z.infer<typeof z_U__plans_plan__steps>
export type U__plans_plan = z.infer<typeof z_U__plans_plan>
export type U__plans = z.infer<typeof z_U__plans>
