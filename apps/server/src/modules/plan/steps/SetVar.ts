//
//
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import { type U__plans_plan_set_var_Params, z_U__plans_plan_set_var_Params, } from "../types/U__plans_params"
import type { U__plans_plan__step_Params } from "../types/U__plans_plan__step"


//
export async function SetVar(stepParams: U__plans_plan__step_Params, $context: Partial<TContext>): Promise<DataTable> {
	Assert.Var<U__plans_plan_set_var_Params>(
		stepParams,
		z_U__plans_plan_set_var_Params.safeParse(stepParams).success,
		`${STEP.SET_VAR}: Wrong argument passed. Expected an object of variables.`,
	)

	Assert.Var<TContext>($context, `${STEP.SET_VAR}: Context is not initialized.`)

	const {
		data: planData
	} = $context?.$plan as NonNullable<Record<string, unknown>>
	Assert.Var<DataTable>(planData, "Data is not initialized")

	const varsToSet = <U__plans_plan_set_var_Params>stepParams
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
	return planData
}
