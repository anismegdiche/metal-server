//
//
//
import { merge } from "lodash-es"
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestDelete } from "../../schema/types/TSchemaRequest"
import type { TOptionalParameter } from "../../source/@types"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import { type U__plans_plan_delete_Params, z_U__plans_plan_delete_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Delete(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_delete_Params>(
		stepParams,
		z_U__plans_plan_delete_Params.safeParse(stepParams).success,
		`${STEP.DELETE}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestDelete>(
		stepParams,
		new Sandbox($context),
	) as TSchemaRequestDelete

	$context = merge($context, DATAPROVIDER.GetContext($__schemaRequest))

	const { schema } = $__schemaRequest

	// case schema
	if (schema) {
		await _deleteSchema(stepParams, $context)
		return planData
	} else {
		return _deletePlan(stepParams, $context)
	}
}

async function _deleteSchema(stepParams: U__plans_plan_delete_Params, $context?: Partial<TContext>): Promise<void> {

	const schemaRequest = stepParams as TSchemaRequestDelete
	const { schema, entity } = schemaRequest

	const { $schema } = $context!
	const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// only schema --> error
	Assert.Var<string>(entity, `${STEP.DELETE}: entity is required`)

	await Schema.Delete(<TSchemaRequestDelete>{
		...schemaRequest,
		schema: schema ?? $schema,
	})
}

async function _deletePlan(stepParams: U__plans_plan_delete_Params, $context?: Partial<TContext>): Promise<DataTable> {

	const $__schemaRequest = stepParams as TSchemaRequestDelete
	const { entity } = $__schemaRequest

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// entity given --> error
	Assert.Var<string>(entity, !entity, `${STEP.DELETE}: entity should not be given`)

	const _options: TOptionalParameter = DATAPROVIDER.Options.Parse($__schemaRequest, $context)
	const _sqlQueryHelper = DATAPROVIDER.GenerateSqlDelete(
		<TSchemaRequestDelete>{
			entity: planData.Name,
		},
		_options,
	)

	return planData.FreeSql({ sqlQuery: _sqlQueryHelper.Query(), queryParams: _sqlQueryHelper.QueryParams })
}
