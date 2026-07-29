//
//
//
import { merge, omit } from "lodash-es"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestSelect } from "../../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import type { TOptionalParameter } from "../../source/@types"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import { type U__plans_plan_select_Params, z_U__plans_plan_select_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function Select(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_select_Params>(
		stepParams,
		z_U__plans_plan_select_Params.safeParse(stepParams).success,
		`${STEP.SELECT}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const $__stepParams = PlaceHolder.EvaluateJsCode<U__plans_plan_select_Params>(
		stepParams,
		new Sandbox($context),
	) as U__plans_plan_select_Params

	const {
		data: planData
	} = $context.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")


	const $__schemaRequest = omit($__stepParams, "on-error") as TSchemaRequestSelect

	$context = merge(
		$context,
		DATAPROVIDER.GetContext($__schemaRequest)
	)

	return ($__schemaRequest.schema !== undefined && $__schemaRequest.entity !== undefined)
		? await _selectSchema($__schemaRequest, $context)
		: await _selectPlan($__schemaRequest, $context)
}

async function _selectSchema(stepParams: U__plans_plan_select_Params, $context: Partial<TContext>): Promise<DataTable> {

	const schemaRequest = stepParams as TSchemaRequestSelect
	const { schema, entity } = schemaRequest

	const { $schema } = $context
	const { data: planData } = $context.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// data from schema
	const intResp = await Schema.Select(<TSchemaRequestSelect>{
		...schemaRequest,
		schema: schema ?? $schema,
	})

	const schemaResponse = intResp?.Body

	Assert.Var<TSchemaResponse>(
		schemaResponse,
		Schema.IsSchemaResponse(schemaResponse),
		`${STEP.SELECT}: Schema '${schema}' and entity '${entity}' are not valid`,
	)

	const data = schemaResponse?.data

	Assert.Var<DataTable>(
		data,
		DataTable.Is(data),
		`${STEP.SELECT}: Schema '${schema}' and entity '${entity}' are not valid`,
	)

	return data
}

async function _selectPlan(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {
	const schemaRequest = stepParams as TSchemaRequestSelect

	const {
		data: planData
	} = $context.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const options: TOptionalParameter = DATAPROVIDER.Options.Parse(schemaRequest, $context)

	const sqlQueryHelper = DATAPROVIDER.GenerateSqlSelect(
		<TSchemaRequestSelect>{
			entity: planData.Name,
		},
		options
	)

	const sqlQuery = DATAPROVIDER.GetSqlQuery(sqlQueryHelper, options)
	return planData.FreeSql({
		sqlQuery,
		queryParams: sqlQueryHelper.QueryParams,
		returnData: true
	})
}

