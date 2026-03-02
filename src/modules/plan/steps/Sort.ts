//
//
//
import z from "zod"
//
import { DataTable, z_TOrderBy } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import type { TOrderBy } from "../../../types/DataTable"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"


//
export const z_U_config_plans_plan_entity_sort_Params = z_TOrderBy;


//
export type U_config_plans_plan_entity_sort_Params = z.infer<typeof z_U_config_plans_plan_entity_sort_Params>


//
export async function Sort(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
    Assert.Var<U_config_plans_plan_entity_sort_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_sort_Params.safeParse(step.stepArgs).success,
        `${STEP.SORT}: Wrong argument passed`)

    const params = step.stepArgs as TOrderBy
    const { currentDataTable } = step
    return currentDataTable.Sort(params)
}
