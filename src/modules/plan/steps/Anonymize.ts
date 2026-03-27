//
//
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils } from "../../../utils/DataTableUtils"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_anonymize_Params, z_U__plans_plan_anonymize_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Anonymize(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {
	
	Assert.Var<U__plans_plan_anonymize_Params>(
		stepParams,
		z_U__plans_plan_anonymize_Params.safeParse(stepParams).success,
		`${STEP.ANONYMIZE}: Wrong argument passed`,
	)

	const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const {
		fields
	} = stepParams as U__plans_plan_anonymize_Params

	return DataTableUtils.Anonymize(planData, fields)
}
