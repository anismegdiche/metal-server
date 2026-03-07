//
//
//
import z from "zod"
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils } from "../../../utils/DataTableUtils"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"

import {
	REMOVE_DUPLICATES_METHOD,
	REMOVE_DUPLICATES_STRATEGY,
	type U__plans_plan_remove_duplicates_Params,
	z_U__plans_plan_remove_duplicates_Params,
} from "../types/U__plans_params"

//
export async function RemoveDuplicates(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_remove_duplicates_Params>(
		step.stepArgs,
		z_U__plans_plan_remove_duplicates_Params.safeParse(step.stepArgs).success,
		`${STEP.REMOVE_DUPLICATE}: Wrong argument passed`,
	)

	const { keys, method, strategy, condition } = step.stepArgs

	const { currentDataTable } = step

	await DataTableUtils.RemoveDuplicates(currentDataTable, keys, method, strategy, condition)

	Logger.Debug(`${Logger.Out} ${STEP.REMOVE_DUPLICATE}: ${JsonUtils.Stringify(step.stepArgs)}`)
	return currentDataTable
}
