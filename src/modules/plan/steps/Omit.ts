//
//
//
import z from "zod"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"


//
export const z_U_config_plans_plan_entity_omit_Params = z.array(z.string());


//
export type U_config_plans_plan_entity_omit_Params = z.infer<typeof z_U_config_plans_plan_entity_omit_Params>


//
export async function Omit(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
    Assert.Var<U_config_plans_plan_entity_omit_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_omit_Params.safeParse(step.stepArgs).success,
        `${[STEP.OMIT]}: Wrong argument passed`)

    return step.currentDataTable.Omit(step.stepArgs)
}
