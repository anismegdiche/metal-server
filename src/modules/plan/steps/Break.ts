//
//
//
import { Assert } from "../../../utils/Assert"
import { STEP } from "../@consts"
import { type U__plans_plan_break_Params, z_U__plans_plan_break_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Break(stepParams: U__plans_plan__step_Params): Promise<undefined> {
	Assert.Var<U__plans_plan_break_Params>(
		stepParams,
		z_U__plans_plan_break_Params.safeParse(stepParams).success,
		`${STEP.BREAK}: Wrong argument passed`,
	)
	return undefined
}
