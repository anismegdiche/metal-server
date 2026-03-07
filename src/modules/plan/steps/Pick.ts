//
//
//
import z from "zod"
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { StringUtils } from "../../../utils/StringUtils"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"

import {
	type U__plans_plan_pick_Params,
	z_U__plans_plan_pick_Params,
} from "../types/U__plans_params"

//
export async function Pick(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_pick_Params>(
		step.stepArgs,
		z_U__plans_plan_pick_Params.safeParse(step.stepArgs).success,
		`${STEP.PICK}: Wrong argument passed`,
	)

	const { fields } = step.stepArgs as U__plans_plan_pick_Params

	if (fields.join("") === "*") 
		return step.currentDataTable

	if (Array.isArray(fields)) {
		return step.currentDataTable.Pick(fields)
	} else {
		Assert.Condition(!StringUtils.IsEmpty(fields), `${[STEP.PICK]}: fields cannot be empty`)
		return step.currentDataTable.Pick(StringUtils.Split(fields, ","))
	}
}
