//
//
//

import { JsonUtils } from "@metal/utils"
import { merge, omit } from "lodash-es"
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { HttpErrorNotFound } from "../../errors/HttpErrors"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestListEntities } from "../../schema/types/TSchemaRequest"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import { type U__plans_plan_list_entities_Params, z_U__plans_plan_list_entities_Params } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"

//
export async function ListEntities(
	stepParams: U__plans_plan__step_Params,
	$context: Partial<TContext>,
): Promise<DataTable> {
	Assert.Var<U__plans_plan_list_entities_Params>(
		stepParams,
		z_U__plans_plan_list_entities_Params.safeParse(stepParams).success,
		`${STEP.LIST_ENTITIES}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const $__stepParams: U__plans_plan_list_entities_Params =
		PlaceHolder.EvaluateJsCode<U__plans_plan_list_entities_Params>(
			stepParams,
			new Sandbox($context),
		) as U__plans_plan_list_entities_Params

	const $__schemaRequest: TSchemaRequestListEntities = omit($__stepParams, "on-error") as TSchemaRequestListEntities

	$context = merge($context, DATAPROVIDER.GetContext($__schemaRequest))

	const { schema } = $__schemaRequest

	const { $schema } = $context
	const { data: planData } = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// data from schema
	const _intResp = await Schema.ListEntities(<TSchemaRequestListEntities>{
		...$__stepParams,
		schema: schema ?? $schema,
	})

	const _isSchemaResponse = Schema.IsSchemaResponse(_intResp.Body)

	if (_intResp.Body && _isSchemaResponse) return _intResp.Body.data
	else {
		throw new HttpErrorNotFound(`${STEP.LIST_ENTITIES}: Schema '${schema}' is not valid`)
	}
}
