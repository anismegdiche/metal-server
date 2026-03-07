//
//
//
import type { TRow } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP, STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY } from "../@consts"
import { Step } from "../Step"
import type { TStep } from "../types/TStep"
import { type U__plans_plan_map_Params, z_U__plans_plan_map_Params, } from "../types/U__plans_params"
import type { U__step_on_error_Params } from "../types/U__plans_plan_on_error"


//
const DEFAULT: Partial<U__plans_plan_map_Params> = {
	"on-error": {
		strategy: STEP_ON_ERROR_STRATEGY.THROW,
		scope: STEP_ON_ERROR_SCOPE.STEP
	}
}


//
export async function MapRows(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_map_Params>(
		step.stepArgs,
		z_U__plans_plan_map_Params.safeParse(step.stepArgs).success,
		`${STEP.MAP}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`,
	)

	const { script } = step.stepArgs
	const { currentDataTable } = step

	Assert.Var<DataTable>(
		currentDataTable,
		DataTable.Is(currentDataTable) === true,
		`${STEP.MAP}: Current data table is required`,
	)

	try {
		const mappedDataTable = await currentDataTable.Copy(`${currentDataTable.Name}_mapped`)

		// Extract error configuration
		const stepConfig = { [STEP.MAP]: step.stepArgs }
		const onErrorConfig = Step.ExtractOnErrorConfig(stepConfig)

		// If error handling is configured for row-level scope, use it
		if (onErrorConfig?.scope === "row") {
			await _mapRowsScopeRow(mappedDataTable, $context, script, onErrorConfig)
		} else {
			// Use legacy error handling for backward compatibility
			await _mapRowsScopTopLevel(step, mappedDataTable, $context, script)
		}

		return mappedDataTable
	} catch (error) {
		Logger.Error(`${STEP.MAP}: Error during mapping operation: ${error}`)
		throw error
	}
}

async function _mapRowsScopTopLevel(step: TStep, mappedDataTable: DataTable, $context: Partial<TContext> | undefined, script: string) {

	const { "on-error": onError = DEFAULT["on-error"] } = step.stepArgs as U__plans_plan_map_Params

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
	onErrorConfig: U__step_on_error_Params) {
	await mappedDataTable.RowsMap(async (row: TRow) => {
		return await Step.ExecuteRowWithErrorHandling(
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
			onErrorConfig
		)
	})
}

