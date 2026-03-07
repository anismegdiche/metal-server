//
//
//

import { merge } from "lodash-es"
import z from "zod"
//
import type { DataTable, TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import type { TSchemaRequestInsert } from "../../schema/types/TSchemaRequest"
import { z_TSchemaRequestInsert } from "../../schema/types/TSchemaRequest"
import { STEP } from "../@consts"
import { DATAPROVIDER } from "../consts/DATAPROVIDER"
import type { TStep } from "../types/TStep"

import {
	type U__plans_plan_insert_Params,
	z_U__plans_plan_insert_Params,
} from "../types/U__plans_params"

//
export async function Insert(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_insert_Params>(
		step.stepArgs,
		z_U__plans_plan_insert_Params.safeParse(step.stepArgs).success,
		`${STEP.INSERT}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`,
	)

	const { currentDataTable, stepArgs } = step

	const $__schemaRequest = PlaceHolder.EvaluateJsCode<TSchemaRequestInsert>(
		stepArgs,
		new Sandbox($context),
	) as TSchemaRequestInsert

	$context = merge($context, DATAPROVIDER.GetContext($__schemaRequest))

	const { schema } = $__schemaRequest

	// case schema
	if (schema) {
		await _insertSchema(step)
		return currentDataTable
	} else {
		return _insertPlan(step)
	}
}

async function _insertSchema(step: TStep, _$context?: Partial<TContext>): Promise<void> {
	const { currentSchemaName, currentDataTable, stepArgs } = step
	const schemaRequest = stepArgs as TSchemaRequestInsert
	const { schema, entity, data } = schemaRequest

	// only schema --> error
	Assert.Var<string>(entity, `${STEP.INSERT}: entity is required`)
	// At least one have data
	Assert.Condition(
		(data as TRow[])?.length > 0 || (await currentDataTable.Count()) > 0,
		`${STEP.INSERT}: No data to insert ${JsonUtils.Stringify(step.stepArgs)}`,
	)

	await Schema.Insert(<TSchemaRequestInsert>{
		...schemaRequest,
		schema: schema ?? currentSchemaName,
		data: data ?? (await currentDataTable.Rows()),
	})
}

async function _insertPlan(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
	const { currentDataTable, stepArgs } = step
	const $__schemaRequest = stepArgs as TSchemaRequestInsert
	const { entity, data } = $__schemaRequest

	// entity given --> error
	Assert.Var<string>(entity, !entity, `${STEP.INSERT}: entity should not be given`)

	// At least one have data
	Assert.Condition(
		(data as TRow[])?.length > 0,
		`${STEP.INSERT}: No data to insert ${JsonUtils.Stringify(step.stepArgs)}`,
	)

	return currentDataTable.RowsAdd(data)
}
