//
//
//
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_break_Params, z_U__plans_plan_break_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Break(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<boolean> {

	Assert.Var<U__plans_plan_break_Params>(
		stepParams,
		z_U__plans_plan_break_Params.safeParse(stepParams).success,
		`${STEP.BREAK}: Wrong argument passed`,
	)

	const $__stepParams = PlaceHolder.EvaluateJsCode<boolean>(
		stepParams,
		new Sandbox($context),
	) as boolean

	return stepParams === null || $__stepParams === true
}
