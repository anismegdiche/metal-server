//
//
//
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"
import { type U__plans_plan_omit_Params, z_U__plans_plan_omit_Params } from "../types/U__plans_params"


//
export async function Omit(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_omit_Params>(
		step.stepArgs,
		z_U__plans_plan_omit_Params.safeParse(step.stepArgs).success,
		`${[STEP.OMIT]}: Wrong argument passed`,
	)

	const { fields } = step.stepArgs as U__plans_plan_omit_Params

	return step.currentDataTable.Omit(fields)
}
