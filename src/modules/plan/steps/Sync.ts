//
//
//

import { map, omit } from "lodash-es"
import z from "zod"
import type { TRow } from "../../../types/DataTable"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils } from "../../../utils/DataTableUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"
import { _select } from "./Select"

import {
	type U__plans_plan_sync_Params,
	z_U__plans_plan_sync_Params,
} from "../types/U__plans_params"

//
export async function Sync(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_sync_Params>(
		step.stepArgs,
		z_U__plans_plan_sync_Params.safeParse(step.stepArgs).success,
		`${[STEP.SYNC]}: Wrong argument passed`,
	)

	const stepArgs = step.stepArgs

	const $__stepArgs = PlaceHolder.EvaluateJsCode<U__plans_plan_sync_Params>(
		stepArgs,
		new Sandbox($context),
	) as U__plans_plan_sync_Params

	const { from, to, id } = $__stepArgs

	Assert.Var<string>(id, "'id' must be provided")
	Assert.Condition(from !== undefined || to !== undefined, "Either 'from' and 'to' must be provided")

	const dtSource: DataTable = from
		? ((await _select(from.schema, from.entity)) ?? new DataTable(from.entity))
		: step.currentDataTable

	const dtDestination: DataTable = to
		? ((await _select(to.schema, to.entity)) ?? new DataTable(to.entity))
		: step.currentDataTable

	const syncReport = await DataTableUtils.SyncReport({
		source: dtSource,
		destination: dtDestination,
		on: id,
	})

	// Apply transformations
	//// Delete

	map(syncReport.DeletedRows, id).forEach((value: unknown) =>
		Schema.Delete({
			schema: to.schema,
			entity: to.entity,
			filter: {
				[id]: value,
			},
		}),
	)

	//// Update
	syncReport.UpdatedRows.forEach((row: TRow) =>
		Schema.Update({
			schema: to.schema,
			entity: to.entity,
			filter: {
				[id]: row[id],
			},

			data: [omit(row, id)],
		}),
	)

	//// Insert
	if (syncReport.AddedRows.length > 0) {
		await Schema.Insert({
			schema: to.schema,
			entity: to.entity,
			data: syncReport.AddedRows,
		})
	}

	// if no destination
	if (!to) {
		await step.currentDataTable.RowsSet([...syncReport.DeletedRows, ...syncReport.UpdatedRows, ...syncReport.AddedRows])
	}

	return step.currentDataTable.FieldsSet()
}
