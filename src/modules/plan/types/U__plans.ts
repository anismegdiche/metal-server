//
//
//
import z from "zod"
//
import { z_U__plans_plan__step } from "./U__plans_plan__step"
import { z_U__step_on_error_Params } from "./U__plans_plan_on_error"

//
export const z_U__plans_plan__steps = z.array(z_U__plans_plan__step)

export const z_U__plans_plan = z.object({
	// Entities with their steps
	entities: z.record(
		z.string("Entity name is required").describe("entityName"),
		z_U__plans_plan__steps,
	).optional().describe("Plan entities and steps"),
	
	// Plan-level error handling defaults
	"on-error": z_U__step_on_error_Params.optional().describe("Plan-level error handling defaults"),
}).describe("Plan configuration")

export const z_U__plans = z.record(z.string("Plan name is required").describe("planName"), z_U__plans_plan)

//
export type U__plans_plan__steps = z.infer<typeof z_U__plans_plan__steps>
export type U__plans_plan = z.infer<typeof z_U__plans_plan>
export type U__plans = z.infer<typeof z_U__plans>
