//
//
//
import { merge } from "lodash-es"
import z from "zod"
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestDelete } from "../../schema/types/TSchemaRequest"
import { z_TSchemaRequestDelete } from "../../schema/types/TSchemaRequest"
import type { TOptionalParameter } from "../../source/@types"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import type { TStep } from "../types/TStep"

import {
	type U_config_plans_plan_entity_delete_Params,
	z_U_config_plans_plan_entity_delete_Params,
} from "../types/U_config_plans_params"

//
export async function Delete(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U_config_plans_plan_entity_delete_Params>(
		step.stepArgs,
		z_U_config_plans_plan_entity_delete_Params.safeParse(step.stepArgs).success,
		`${STEP.DELETE}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`,
	)

	const { currentDataTable, stepArgs } = step

	const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestDelete>(
		stepArgs,
		new Sandbox($context),
	) as TSchemaRequestDelete

	$context = merge($context, DATAPROVIDER.GetContext($__schemaRequest))

	const { schema } = $__schemaRequest

	// case schema
	if (schema) {
		await _deleteSchema(step)
		return currentDataTable
	} else {
		return _deletePlan(step)
	}
}

async function _deleteSchema(step: TStep, _$context?: Partial<TContext>): Promise<void> {
	const { currentSchemaName, stepArgs } = step
	const $__schemaRequest = stepArgs as TSchemaRequestDelete
	const { schema, entity } = $__schemaRequest

	// only schema --> error
	Assert.Var<string>(entity, `${STEP.DELETE}: entity is required`)

	await Schema.Delete(<TSchemaRequestDelete>{
		...$__schemaRequest,
		schema: schema ?? currentSchemaName,
	})
}

async function _deletePlan(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
	const { currentDataTable, stepArgs } = step
	const $__schemaRequest = stepArgs as TSchemaRequestDelete
	const { entity } = $__schemaRequest

	// entity given --> error
	Assert.Var<string>(entity, !entity, `${STEP.DELETE}: entity should not be given`)

	const _options: TOptionalParameter = DATAPROVIDER.Options.Parse($__schemaRequest, $context)
	const _sqlQueryHelper = DATAPROVIDER.GenerateSqlDelete(
		<TSchemaRequestDelete>{
			entity: currentDataTable.Name,
		},
		_options,
	)

	return currentDataTable.FreeSql({ sqlQuery: _sqlQueryHelper.Query(), queryParams: _sqlQueryHelper.QueryParams })
}
