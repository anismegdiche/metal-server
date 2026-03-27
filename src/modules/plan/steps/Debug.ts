//
//
//
import type { DataTable } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
import { Assert } from "../../../utils/Assert"
import { METADATA } from "../../core/@consts"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_debug_Params, z_U__plans_plan_debug_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Debug(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_debug_Params>(
		stepParams,
		z_U__plans_plan_debug_Params.safeParse(stepParams).success,
		`${STEP.DEBUG}: Wrong argument passed`,
	)

	const { data } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(data, "Data is not initialized")

	const debug = stepParams
	data.MetaDataSet(METADATA.PLAN_DEBUG, debug)

	if (data.MetaData[METADATA.PLAN_ERRORS] === undefined) {
		data.MetaDataSet(METADATA.PLAN_ERRORS, <TJson[]>[])
	}

	return data
}
