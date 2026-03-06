//
//
//
import z from "zod"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils, JOIN_TYPE } from "../../../utils/DataTableUtils"
import { Helper } from "../../../utils/Helper"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"
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

import {
	type U_config_plans_plan_entity_join_Params,
	z_U_config_plans_plan_entity_join_Params,
} from "../types/U_config_plans_params"

//
export async function Join(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U_config_plans_plan_entity_join_Params>(
		step.stepArgs,
		z_U_config_plans_plan_entity_join_Params.safeParse(step.stepArgs).success,
		`${STEP.JOIN}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`,
	)

	const { currentPlanName, currentDataTable: dtLeft, currentSchemaName, stepArgs } = step

	if (stepArgs === null) return dtLeft

	const $__stepArgs = PlaceHolder.EvaluateJsCode<Record<string, string>>(stepArgs, new Sandbox($context)) as Record<
		string,
		string
	>

	const { schema, entity, type, "left-field": leftField, "right-field": rightField } = $__stepArgs

	Assert.Var<string>(entity, `${STEP.JOIN}: entity is required`)
	Assert.Var<string>(type, `${STEP.JOIN}: type is required`)
	Assert.Var<string>(leftField, `${STEP.JOIN}: left-field is required`)
	Assert.Var<string>(rightField, `${STEP.JOIN}: right-field is required`)

	const requestToSchema: TStep = {
		currentPlanName,
		currentSchemaName,
		currentDataTable: new DataTable(),
		stepArgs: {
			schema,
			entity,
		},
	}

	using dtRight = await Select(requestToSchema)
	return (
		_joinCaseMap[type]?.(dtLeft, dtRight, leftField, rightField) ?? (Helper.CaseMapNotFound(type) && dtLeft) ?? dtLeft
	)
}
