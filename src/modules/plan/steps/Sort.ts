//
//
//
import type { DataTable, TOrderBy } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_sort_Params, z_U__plans_plan_sort_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Sort(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {
	
	Assert.Var<U__plans_plan_sort_Params>(
		stepParams,
		z_U__plans_plan_sort_Params.safeParse(stepParams).success,
		`${STEP.SORT}: Wrong argument passed`,
	)

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const params = stepParams as TOrderBy
	return planData.Sort(params)
}
