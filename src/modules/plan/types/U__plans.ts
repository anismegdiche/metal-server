//
//
//
import z from "zod"
//
import { z_U__plans_plan__step } from "./U__plans_plan__step"
import { z_U__on_error_Params } from "./U__plans_plan_on_error"

//
export const z_U__plans_plan__steps = z.array(z_U__plans_plan__step).describe("Plan entity steps")

export const z_U__plans_plan = z.record(
	z.string("Entity name is required").describe("entity name"),
	z.object({
		steps: z_U__plans_plan__steps,
		// Plan-level error handling defaults
		"on-error": z_U__on_error_Params.optional().describe("Plan-level error handling defaults"),
	}).describe("Plan configuration")
)

export const z_U__plans = z.record(z.string("Plan name is required").describe("planName"), z_U__plans_plan)

//
export type U__plans_plan__steps = z.infer<typeof z_U__plans_plan__steps>
export type U__plans_plan = z.infer<typeof z_U__plans_plan>
export type U__plans = z.infer<typeof z_U__plans>
