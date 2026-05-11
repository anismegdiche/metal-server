//
//
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_sort_Params, z_U__plans_plan_sort_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Sort(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_sort_Params>(
		stepParams,
		z_U__plans_plan_sort_Params.safeParse(stepParams).success,
		`${STEP.SORT}: Wrong argument passed`,
	)

	const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_sort_Params>(
		stepParams,
		new Sandbox($context),
	) as U__plans_plan_sort_Params

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	return planData.Sort($__stepParams.fields)
}
