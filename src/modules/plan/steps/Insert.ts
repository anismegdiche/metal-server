//
//
//
import { merge } from "lodash-es"
//
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestInsert } from "../../schema/types/TSchemaRequest"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import { type U__plans_plan_insert_Params, z_U__plans_plan_insert_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Insert(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_insert_Params>(
		stepParams,
		z_U__plans_plan_insert_Params.safeParse(stepParams).success,
		`${STEP.INSERT}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestInsert>(
		stepParams,
		new Sandbox($context),
	) as TSchemaRequestInsert

	$context = merge($context, DATAPROVIDER.GetContext($__schemaRequest))

	const { schema } = $__schemaRequest

	// case schema
	if (schema) {
		await _insertSchema(stepParams, $context)
		return planData
	} else {
		return _insertPlan(stepParams, $context)
	}
}

async function _insertSchema(stepParams: U__plans_plan_insert_Params, $context?: Partial<TContext>): Promise<void> {

	const schemaRequest = stepParams as TSchemaRequestInsert
	const { schema, entity, data } = schemaRequest

	const { $schema } = $context!
	const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// only schema --> error
	Assert.Var<string>(entity, `${STEP.INSERT}: entity is required`)
	// At least one have data
	Assert.Condition(
		(data as TRow[])?.length > 0 || (await planData.Count()) > 0,
		`${STEP.INSERT}: No data to insert ${JsonUtils.Stringify(stepParams)}`,
	)

	await Schema.Insert(<TSchemaRequestInsert>{
		...schemaRequest,
		schema: schema ?? $schema,
		data: data ?? (await planData.Rows()),
	})
}

async function _insertPlan(stepParams: U__plans_plan_insert_Params, $context?: Partial<TContext>): Promise<DataTable> {

	const schemaRequest = stepParams as TSchemaRequestInsert
	const { entity, data } = schemaRequest

	const {
		data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// entity given --> error
	Assert.Var<string>(entity, !entity, `${STEP.INSERT}: entity should not be given`)

	// At least one have data
	Assert.Condition(
		(data as TRow[])?.length > 0,
		`${STEP.INSERT}: No data to insert ${JsonUtils.Stringify(stepParams)}`,
	)

	return planData.RowsAdd(data)
}

export function _insertRow(row: TRow, stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<TRow> {
	return Insert(
		{
			...stepParams as TSchemaRequestInsert,
			data: row
		},
		$context
	)
}
