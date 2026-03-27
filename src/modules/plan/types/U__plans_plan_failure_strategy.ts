//
//
//
import z from "zod";
//
import { PLAN_FAILURE_STRATEGY_RETURN } from "../@consts";


//
export const z_U__failure_strategy_Params = z
	.enum(PLAN_FAILURE_STRATEGY_RETURN, { message: "Invalid failure-strategy: must be one of: step, row, or plan" })


//
export type U__failure_strategy_Params = z.infer<typeof z_U__failure_strategy_Params>