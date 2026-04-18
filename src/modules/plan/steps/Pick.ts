//
//
//
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { RowUtils } from "../../../utils/RowUtils"
import { StringUtils } from "../../../utils/StringUtils"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_pick_Params, z_U__plans_plan_pick_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Pick(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_pick_Params>(
		stepParams,
		z_U__plans_plan_pick_Params.safeParse(stepParams).success,
		`${STEP.PICK}: Wrong argument passed`,
	)

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const { fields } = stepParams as U__plans_plan_pick_Params

	if (fields.join("") === "*")
		return planData

	if (Array.isArray(fields)) {
		return planData.Pick(fields)
	} else {
		Assert.Condition(!StringUtils.IsEmpty(fields), `${[STEP.PICK]}: fields cannot be empty`)
		return planData.Pick(StringUtils.Split(fields, ","))
	}
}

export function _pickRow(row: TRow, stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<TRow> {
	const { fields } = stepParams as U__plans_plan_pick_Params

	if (fields.join("") === "*")
		return Promise.resolve(row)

	return Promise.resolve(
		RowUtils.Pick(row, fields)
	)
}
