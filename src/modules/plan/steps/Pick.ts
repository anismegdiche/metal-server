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
	type U_config_plans_plan_entity_pick_Params,
	z_U_config_plans_plan_entity_pick_Params,
} from "../types/U_config_plans_params"

//
export async function Pick(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U_config_plans_plan_entity_pick_Params>(
		step.stepArgs,
		z_U_config_plans_plan_entity_pick_Params.safeParse(step.stepArgs).success,
		`${STEP.PICK}: Wrong argument passed`,
	)

	const params = step.stepArgs

	if (params.join("") === "*") return step.currentDataTable

	if (Array.isArray(params)) {
		return step.currentDataTable.Pick(params)
	} else {
		Assert.Condition(!StringUtils.IsEmpty(params), `${[STEP.PICK]}: params cannot be empty`)
		return step.currentDataTable.Pick(StringUtils.Split(params, ","))
	}
}
