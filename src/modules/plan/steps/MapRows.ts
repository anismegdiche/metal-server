//
//
//
import type { DataTable } from "../../../types/DataTable"
import type { TRow } from "../../../types/DataTableTypes"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP, STEP_ON_ERROR_STRATEGY } from "../@consts"
import { Step } from "../Step"
import { type U__plans_plan_map_Params, z_U__plans_plan_map_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function MapRows(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {

	Assert.Var<U__plans_plan_map_Params>(
		stepParams,
		z_U__plans_plan_map_Params.safeParse(stepParams).success,
		`${STEP.MAP}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	// const mappedDataTable = await planData.Copy(`${planData.Name}_mapped`)

	// await mappedDataTable.RowsMap((row: TRow) => 
	// 	_mapRow(row, stepParams, $context)
	// )

	return planData.RowsMap((row: TRow) => 
		_mapRow(row, stepParams, $context)
	)
}

export async function _mapRow(row: TRow, stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<TRow> {
	
	const { script } = stepParams as U__plans_plan_map_Params
	const rowContext = { ...$context, $row: row }
	const rowSandbox = new Sandbox(rowContext)

	const wrappedScript = `
		(function () {
			${script}
			return $row;
		})()`

	const result = rowSandbox.Evaluate(wrappedScript, true)

	if (result !== null && typeof result === "object" && !Array.isArray(result)) {
		return result
	}

	return rowContext.$row
}
