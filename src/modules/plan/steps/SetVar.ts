//
//
//
import { z } from 'zod';
//
import { DataTable } from '../../../types/DataTable';
import { z_TJson, type TJson } from '../../../types/TJson';
import { Assert } from '../../../utils/Assert';
import { PlaceHolder } from '../../../utils/PlaceHolder';
import { Sandbox } from '../../sandbox/Sandbox';
import type { TContext } from '../../sandbox/types/TContext';
import { STEP } from '../@consts';
import type { TStep } from '../types/TStep';


//
export const z_U_config_plans_plan_entity_set_var_Params = z_TJson


//
export type U_config_plans_plan_entity_set_var_Params = z.infer<typeof z_U_config_plans_plan_entity_set_var_Params>


//
export async function SetVar(step: TStep, $context?: Partial<TContext>): Promise<DataTable> {
    Assert.Var<U_config_plans_plan_entity_set_var_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_set_var_Params.safeParse(step.stepArgs).success,
        `${STEP.SET_VAR}: Wrong argument passed. Expected an object of variables.`);

    Assert.Var<TContext>($context, `${STEP.SET_VAR}: Context is not initialized.`);
    Assert.Var<TJson>($context.$vars, `${STEP.SET_VAR}: Context is not initialized.`);

    const varsToSet = <U_config_plans_plan_entity_set_var_Params>step.stepArgs;
    const sandbox = new Sandbox($context);

    for (const [key, value] of Object.entries(varsToSet)) {
        // Evaluate the value if it contains ${{ ... }}
        const evaluatedValue = PlaceHolder.EvaluateJsCode(value, sandbox);
        $context.$vars[key] = evaluatedValue;
    }
    return step.currentDataTable;
}
