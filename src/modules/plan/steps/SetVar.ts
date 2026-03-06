//
//
//
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"

import {
	type U_config_plans_plan_entity_set_var_Params,
	z_U_config_plans_plan_entity_set_var_Params,
} from "../types/U_config_plans_params"

//
export async function SetVar(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U_config_plans_plan_entity_set_var_Params>(
		step.stepArgs,
		z_U_config_plans_plan_entity_set_var_Params.safeParse(step.stepArgs).success,
		`${STEP.SET_VAR}: Wrong argument passed. Expected an object of variables.`,
	)

	Assert.Var<TContext>($context, `${STEP.SET_VAR}: Context is not initialized.`)

	const varsToSet = <U_config_plans_plan_entity_set_var_Params>step.stepArgs
	const sandbox = new Sandbox($context)

	for (const [key, value] of Object.entries(varsToSet)) {
		// Validate key name (no special characters that could cause issues)
		Assert.Condition(
			/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key),
			`${STEP.SET_VAR}: Invalid variable name '${key}'. Variable names must be valid JavaScript identifiers.`,
		)

		// Evaluate the value if it contains ${{ ... }} or use as-is
		const evaluatedValue =
			typeof value === "string" && value.includes("${{") ? PlaceHolder.EvaluateJsCode(value, sandbox) : value

		// Set the variable in $vars only
		$context.$vars = {
			...$context.$vars,
			[key]: evaluatedValue,
		}
	}
	return step.currentDataTable
}
