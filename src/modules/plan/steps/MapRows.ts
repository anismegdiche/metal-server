//
//
//
import { z } from "zod"
//
import type { TRow } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"

import {
	MAP_ON_ERROR,
	type U_config_plans_plan_entity_map_Params,
	z_U_config_plans_plan_entity_map_Params,
} from "../types/U_config_plans_params"

//
export async function MapRows(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U_config_plans_plan_entity_map_Params>(
		step.stepArgs,
		z_U_config_plans_plan_entity_map_Params.safeParse(step.stepArgs).success,
		`${STEP.MAP}: Wrong argument passed ${JsonUtils.Stringify(step.stepArgs)}`,
	)

	const DEFAULT: Partial<U_config_plans_plan_entity_map_Params> = {
		"on-error": MAP_ON_ERROR.THROW,
	}

	const { script, "on-error": onError = DEFAULT["on-error"] } = step.stepArgs

	const { currentDataTable } = step

	Assert.Var<DataTable>(
		currentDataTable,
		DataTable.Is(currentDataTable) === true,
		`${STEP.MAP}: Current data table is required`,
	)

	try {
		const mappedDataTable = await currentDataTable.Copy(`${currentDataTable.Name}_mapped`)

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

				switch (onError) {
					case MAP_ON_ERROR.SKIP:
						await mappedDataTable.RowDeleteByIndex(row.__idx__)
						break

					case MAP_ON_ERROR.MARK:
						return {
							...row,
							__map_error__: String(error),
						}
					default:
						throw error
				}
			}
		})

		return mappedDataTable
	} catch (error) {
		Logger.Error(`${STEP.MAP}: Error during mapping operation: ${error}`)
		throw error
	}
}
