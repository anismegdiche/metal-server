//
//
//
import { merge, omit } from "lodash-es"
//
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestUpdate } from "../../schema/types/TSchemaRequest"
import type { TOptionalParameter } from "../../source/@types"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import { type U__plans_plan_update_Params, z_U__plans_plan_update_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Update(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_update_Params>(
		stepParams,
		z_U__plans_plan_update_Params.safeParse(stepParams).success,
		`${STEP.UPDATE}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_update_Params>(
		stepParams,
		new Sandbox($context),
	) as U__plans_plan_update_Params

	const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const $__schemaRequest = omit($__stepParams, "on-error") as TSchemaRequestUpdate

	$context = merge(
		$context,
		DATAPROVIDER.GetContext($__schemaRequest)
	)

	const { schema } = $__schemaRequest

	// case schema
	if (schema) {
		await _updateSchema(stepParams, $context)
		return planData
	} else {
		return _updatePlan(stepParams, $context)
	}
}

async function _updateSchema(step: U__plans_plan_update_Params, $context: Partial<TContext>): Promise<void> {
	const schemaRequest = step as TSchemaRequestUpdate
	const { schema, entity, data } = schemaRequest

	const { $schema } = $context!
	const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// only schema --> error
	Assert.Var<string>(entity, `${STEP.UPDATE}: entity is required`)
	// At least one have data
	Assert.Condition(
		(data as TRow[])?.length > 0 || (await planData.Count()) > 0,
		`${STEP.UPDATE}: No data to insert ${JsonUtils.Stringify(step)}`,
	)

	await Schema.Update(<TSchemaRequestUpdate>{
		...schemaRequest,
		schema: schema ?? $schema,
		data: data ?? (await planData.Rows()),
	})
}

async function _updatePlan(step: U__plans_plan_update_Params, $context: Partial<TContext>): Promise<DataTable> {
	const schemaRequest = step as TSchemaRequestUpdate
	const { entity, data } = schemaRequest

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// entity given --> error
	Assert.Var<string>(entity, !entity, `${STEP.UPDATE}: entity should not be given`)

	// At least one have data
	Assert.Condition(
		(data as TRow[])?.length > 0,
		`${STEP.UPDATE}: No data to update ${JsonUtils.Stringify(step)}`,
	)

	const _options: TOptionalParameter = DATAPROVIDER.Options.Parse(schemaRequest, $context)

	const _sqlQueryHelper = await DATAPROVIDER.GenerateSqlUpdate(
		<TSchemaRequestUpdate>{
			entity: planData.Name,
		},
		_options
	)

	return planData.FreeSql({ sqlQuery: _sqlQueryHelper.Query(), queryParams: _sqlQueryHelper.QueryParams })
}
