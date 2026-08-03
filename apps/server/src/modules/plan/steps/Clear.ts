//
//
//

import { JsonUtils } from "@metal/utils"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_clear_Params, z_U__plans_plan_clear_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"

//
export async function Clear(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_clear_Params>(
		stepParams,
		z_U__plans_plan_clear_Params.safeParse(stepParams).success,
		`${STEP.CLEAR}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// Clear all variables from context
	if ($context) {
		$context.$vars = {}
		delete $context.$row
		delete $context.$response
		delete $context.$result
		delete $context.$error
		delete $context.$request
		if ($context.$plan) {
			$context.$plan.data = new DataTable(planData.Name)
		}
	}

	return new DataTable(planData.Name)
}
