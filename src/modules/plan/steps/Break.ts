//
//
//
import z from "zod"
//
import { Assert } from "../../../utils/Assert"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"

import {
	type U__plans_plan_break_Params,
	z_U__plans_plan_break_Params,
} from "../types/U__plans_params"

//
export async function Break(step: TStep, _$context?: Partial<TContext>): Promise<undefined> {
	Assert.Var<U__plans_plan_break_Params>(
		step.stepArgs,
		z_U__plans_plan_break_Params.safeParse(step.stepArgs).success,
		`${STEP.BREAK}: Wrong argument passed`,
	)
	throw new Error("__BREAK__")
}
