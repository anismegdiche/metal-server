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
import type { U__on_error_Params } from "../types/U__plans_plan_on_error"


//
export async function MapRows(stepParams: U__plans_plan__step_Params, $context?: Partial<TContext>): Promise<DataTable> {
	
	Assert.Var<U__plans_plan_map_Params>(
		stepParams,
		z_U__plans_plan_map_Params.safeParse(stepParams).success,
		`${STEP.MAP}: Wrong argument passed ${JsonUtils.Stringify(stepParams)}`,
	)

	const { script } = stepParams

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	try {
		const mappedDataTable = await planData.Copy(`${planData.Name}_mapped`)

		// Extract error configuration
		const stepConfig = { [STEP.MAP]: stepParams }
		const onError = Step.GetOnError(stepConfig)

		// If error handling is configured for row-level scope, use it
		if (onError?.scope === "row") {
			await _mapRowsScopeRow(mappedDataTable, $context, script, onError)
		} else {
			// Use legacy error handling for backward compatibility
			await _mapRowsScopeStep(stepParams, mappedDataTable, $context, script)
		}

		return mappedDataTable
	} catch (error) {
		Logger.Error(`${STEP.MAP}: Error during mapping operation: ${error}`)
		throw error
	}
}

async function _mapRowsScopeStep(step: U__plans_plan__step_Params, mappedDataTable: DataTable, $context: Partial<TContext> | undefined, script: string) {

	const { "on-error": onError } = step as U__plans_plan_map_Params

	await mappedDataTable.RowsMap(async (row: TRow) => {
		const rowContext = { ...$context, $row: row }
		const rowSandbox = new Sandbox(rowContext)
		const wrappedScript = `
					(function () {
						${script}
						return $row;
					})()
				`

		try {
			const result = rowSandbox.Evaluate(wrappedScript, true)

			if (result !== null && typeof result === "object" && !Array.isArray(result)) {
				return result
			}

			return rowContext.$row
		} catch (error) {
			Logger.Error(`${STEP.MAP}: Error executing mapping script for row: ${JsonUtils.Stringify(row)} | ${error}`)

			switch (onError?.strategy) {
				case STEP_ON_ERROR_STRATEGY.SKIP:
					await mappedDataTable.RowDeleteByIndex(row.__idx__)
					break
				default:
					throw error
			}
		}
	})
}

async function _mapRowsScopeRow(
	mappedDataTable: DataTable,
	$context: Partial<TContext> | undefined,
	script: string,
	onError: U__on_error_Params) {
	await mappedDataTable.RowsMap(async (row: TRow) => {
		return await Step.OnErrorRow(
			row,
			async (rowData: TRow) => {
				const rowContext = { ...$context, $row: rowData }
				const rowSandbox = new Sandbox(rowContext)
				const wrappedScript = `
							(function () {
								${script}
								return $row;
							})()
						`

				const result = rowSandbox.Evaluate(wrappedScript, true)

				if (result !== null && typeof result === "object" && !Array.isArray(result)) {
					return result
				}

				return rowContext.$row
			},
			$context!,
			onError
		)
	})
}

