//
//
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils } from "../../../utils/DataTableUtils"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_remove_duplicates_Params, z_U__plans_plan_remove_duplicates_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function RemoveDuplicates(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {
	
	Assert.Var<U__plans_plan_remove_duplicates_Params>(
		stepParams,
		z_U__plans_plan_remove_duplicates_Params.safeParse(stepParams).success,
		`${STEP.REMOVE_DUPLICATE}: Wrong argument passed`,
	)

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const { keys, method, strategy, condition } = stepParams

	await DataTableUtils.RemoveDuplicates(planData, keys, method, strategy, condition)

	Logger.Debug(`${Logger.Out} ${STEP.REMOVE_DUPLICATE}: ${JsonUtils.Stringify(stepParams)}`)
	return planData
}
