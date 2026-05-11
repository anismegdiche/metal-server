//
//
//
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils } from "../../../utils/DataTableUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { RowUtils } from "../../../utils/RowUtils"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_anonymize_Params, z_U__plans_plan_anonymize_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Anonymize(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_anonymize_Params>(
		stepParams,
		z_U__plans_plan_anonymize_Params.safeParse(stepParams).success,
		`${STEP.ANONYMIZE}: Wrong argument passed`,
	)

	const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_anonymize_Params>(
		stepParams,
		new Sandbox($context),
	) as U__plans_plan_anonymize_Params

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const {
		fields
	} = $__stepParams as U__plans_plan_anonymize_Params

	return DataTableUtils.Anonymize(planData, fields)
}

export function _anonymizeRow(row: TRow, stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<TRow> {
	Assert.Var<U__plans_plan_anonymize_Params>(
		stepParams,
		z_U__plans_plan_anonymize_Params.safeParse(stepParams).success,
		`${STEP.ANONYMIZE}: Wrong argument passed`,
	)

	const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_anonymize_Params>(
		stepParams,
		new Sandbox($context),
	) as U__plans_plan_anonymize_Params
	
	const { fields } = $__stepParams
	
	return Promise.resolve(RowUtils.Anonymize(row, new Set(fields)))
}
