//
//
//
import z from "zod"
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils } from "../../../utils/DataTableUtils"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"

import {
	type U__plans_plan_anonymize_Params,
	z_U__plans_plan_anonymize_Params,
} from "../types/U__plans_params"

//
export async function Anonymize(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_anonymize_Params>(
		step.stepArgs,
		z_U__plans_plan_anonymize_Params.safeParse(step.stepArgs).success,
		`${STEP.ANONYMIZE}: Wrong argument passed`,
	)

	const {
		fields
	} = step.stepArgs as U__plans_plan_anonymize_Params


	return DataTableUtils.Anonymize(step.currentDataTable, fields)
}
