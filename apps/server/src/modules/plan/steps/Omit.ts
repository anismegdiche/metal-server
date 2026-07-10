//
//
//
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { RowUtils } from "../../../utils/RowUtils"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP, } from "../@consts"
import { type U__plans_plan_omit_Params, z_U__plans_plan_omit_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Omit(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_omit_Params>(
		stepParams,
		z_U__plans_plan_omit_Params.safeParse(stepParams).success,
		`${[STEP.OMIT]}: Wrong argument passed`,
	)

	const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_omit_Params>(
		stepParams,
		new Sandbox($context),
	) as U__plans_plan_omit_Params

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	return planData.Omit($__stepParams.fields)
}

export function _omitRow(row: TRow, stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<TRow> {

	Assert.Var<U__plans_plan_omit_Params>(
		stepParams,
		z_U__plans_plan_omit_Params.safeParse(stepParams).success,
		`${[STEP.OMIT]}: Wrong argument passed`,
	)

	const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_omit_Params>(
		stepParams,
		new Sandbox($context),
	) as U__plans_plan_omit_Params

	const {
		fields
	} = $__stepParams

	return Promise.resolve(
		RowUtils.Omit(row, fields)
	)
}
