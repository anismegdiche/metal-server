//
//
//
import z from "zod";
//
import { PLAN_FAILURE_STRATEGY } from "../@consts";


//
export const z_U__failure_strategy_Params = z
	.enum(PLAN_FAILURE_STRATEGY, { message: "Invalid failure-strategy: must be one of: data, data-errors, or throw" })


//
export type U__failure_strategy_Params = z.infer<typeof z_U__failure_strategy_Params>