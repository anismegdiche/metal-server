//
//
//
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { RowUtils } from "../../../utils/RowUtils"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP, } from "../@consts"
import { type U__plans_plan_omit_Params, z_U__plans_plan_omit_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Omit(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_omit_Params>(
		stepParams,
		z_U__plans_plan_omit_Params.safeParse(stepParams).success,
		`${[STEP.OMIT]}: Wrong argument passed`,
	)

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const { fields } = stepParams as U__plans_plan_omit_Params

	return planData.Omit(fields)
}

export function _omitRow(row: TRow, stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<TRow> {
	const { fields } = stepParams as U__plans_plan_omit_Params

	if (fields.join("") === "*")
		Promise.resolve({})

	return Promise.resolve(
		RowUtils.Omit(row, fields)
	)
}
