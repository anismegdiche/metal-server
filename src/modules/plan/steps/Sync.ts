//
//
//
import { map, omit } from "lodash-es"
//
import type { TRow } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils } from "../../../utils/DataTableUtils"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { Schema } from "../../schema/Schema"
import { STEP } from "../@consts"
import { type U__plans_plan_sync_Params, z_U__plans_plan_sync_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"
import { _select } from "./Select"


//
export async function Sync(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_sync_Params>(
		stepParams,
		z_U__plans_plan_sync_Params.safeParse(stepParams).success,
		`${[STEP.SYNC]}: Wrong argument passed`,
	)

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const $__step = PlaceHolder.EvaluateJsCode<U__plans_plan_sync_Params>(
		stepParams,
		new Sandbox($context),
	) as U__plans_plan_sync_Params

	const { from, to, id } = $__step

	Assert.Var<string>(id, "'id' must be provided")
	Assert.Condition(from !== undefined || to !== undefined, "Either 'from' and 'to' must be provided")

	const dtSource: DataTable = from
		? ((await _select(from.schema, from.entity)) ?? new DataTable(from.entity))
		: planData

	const dtDestination: DataTable = to
		? ((await _select(to.schema, to.entity)) ?? new DataTable(to.entity))
		: planData

	const syncReport = await DataTableUtils.SyncReport({
		source: dtSource,
		destination: dtDestination,
		on: id,
	})

	// Apply transformations
	//// Delete

	map(syncReport.DeletedRows, id).map((value: unknown) =>
		Schema.Delete({
			schema: to.schema,
			entity: to.entity,
			filter: {
				[id]: value,
			},
		}),
	)

	//// Update
	syncReport.UpdatedRows.map((row: TRow) =>
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
		await planData.RowsSet([...syncReport.DeletedRows, ...syncReport.UpdatedRows, ...syncReport.AddedRows])
	}

	return planData.FieldsSet()
}
