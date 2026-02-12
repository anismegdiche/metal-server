//
//
//
import z from "zod"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { DataTableUtils } from "../../../utils/DataTableUtils"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"


//
export const z_U_config_plans_plan_entity_anonymize_Params = z.array(z.string());


//
export type U_config_plans_plan_entity_anonymize_Params = z.infer<typeof z_U_config_plans_plan_entity_anonymize_Params>


//
export async function Anonymize(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {
    Assert.Var<U_config_plans_plan_entity_anonymize_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_anonymize_Params.safeParse(step.stepArgs).success,
        `${STEP.ANONYMIZE}: Wrong argument passed`)
    return DataTableUtils.Anonymize(step.currentDataTable, step.stepArgs)
}
