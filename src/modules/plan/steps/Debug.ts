//
//
//
import z from "zod"
//
import type { DataTable } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
import { Assert } from "../../../utils/Assert"
import { METADATA } from "../../core/@consts"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"

import {
	type U_config_plans_plan_entity_debug_Params,
	z_U_config_plans_plan_entity_debug_Params,
} from "../types/U_config_plans_params"

//
export async function Debug(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U_config_plans_plan_entity_debug_Params>(
		step.stepArgs,
		z_U_config_plans_plan_entity_debug_Params.safeParse(step.stepArgs).success,
		`${STEP.DEBUG}: Wrong argument passed`,
	)

	const debug = step.stepArgs
	step.currentDataTable.MetaDataSet(METADATA.PLAN_DEBUG, debug)

	if (step.currentDataTable.MetaData[METADATA.PLAN_ERRORS] === undefined) {
		step.currentDataTable.MetaDataSet(METADATA.PLAN_ERRORS, <TJson[]>[])
	}

	return step.currentDataTable
}
