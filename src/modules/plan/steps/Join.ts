//
//
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils, JOIN_TYPE } from "../../../utils/DataTableUtils"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_join_Params, type U__plans_plan_select_Params, z_U__plans_plan_join_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"
import { Select } from "./Select"


//
const _joinCaseMap: Record<
	string,
	(dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) => Promise<DataTable>
> = {
	[JOIN_TYPE.LEFT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) =>
		DataTableUtils.LeftJoin(dtLeft, dtRight, leftField, rightField),
	[JOIN_TYPE.RIGHT]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) =>
		DataTableUtils.RightJoin(dtLeft, dtRight, leftField, rightField),
	[JOIN_TYPE.INNER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) =>
		DataTableUtils.InnerJoin(dtLeft, dtRight, leftField, rightField),
	[JOIN_TYPE.FULL_OUTER]: async (dtLeft: DataTable, dtRight: DataTable, leftField: string, rightField: string) =>
		DataTableUtils.FullOuterJoin(dtLeft, dtRight, leftField, rightField),
	[JOIN_TYPE.CROSS]: async (dtLeft: DataTable, dtRight: DataTable) => DataTableUtils.CrossJoin(dtLeft, dtRight),
}

//
export async function Join(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable | undefined> {
	
	Assert.Var<U__plans_plan_join_Params>(
		stepParams,
		z_U__plans_plan_join_Params.safeParse(stepParams).success,
		`${STEP.JOIN}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const {
		data: dtLeft
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(dtLeft, "Data is not initialized")

	if (stepParams === null)
		return dtLeft

	const $__step = PlaceHolder.EvaluateJsCode<U__plans_plan_join_Params>(stepParams, new Sandbox($context)) as U__plans_plan_join_Params

	const { schema, entity, type, "left-field": leftField, "right-field": rightField } = $__step

	Assert.Var<string>(entity, `${STEP.JOIN}: entity is required`)
	Assert.Var<string>(type, `${STEP.JOIN}: type is required`)
	Assert.Var<string>(leftField, `${STEP.JOIN}: left-field is required`)
	Assert.Var<string>(rightField, `${STEP.JOIN}: right-field is required`)

	const stepSelect: U__plans_plan_select_Params = {
		schema,
		entity
	}

	using dtRight = await Select(stepSelect, $context)
	return (
		_joinCaseMap[type]?.(dtLeft, dtRight, leftField, rightField)
	)
}
