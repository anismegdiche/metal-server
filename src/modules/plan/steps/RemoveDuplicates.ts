//
//
//
import z from "zod"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { Logger } from "../../../utils/Logger"
import { JsonUtils } from "../../../utils/JsonUtils"
import { DataTableUtils, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY } from "../../../utils/DataTableUtils"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"


//
export const z_U_config_plans_plan_entity_remove_duplicates_Params = z.union([
    z.object({
        keys: z.array(z.string()).optional(),
        method: z.enum(REMOVE_DUPLICATES_METHOD).optional(),
        strategy: z.union([
            z.literal(REMOVE_DUPLICATES_STRATEGY.FIRST),
            z.literal(REMOVE_DUPLICATES_STRATEGY.LAST)
        ]).optional(),
        condition: z.undefined(),
    }),
    z.object({
        keys: z.array(z.string()).optional(),
        method: z.enum(REMOVE_DUPLICATES_METHOD).optional(),
        strategy: z.union([
            z.literal(REMOVE_DUPLICATES_STRATEGY.LOWEST),
            z.literal(REMOVE_DUPLICATES_STRATEGY.HIGHEST),
            z.literal(REMOVE_DUPLICATES_STRATEGY.CUSTOM)
        ]).optional(),
        condition: z.string(),
    })
]);


//
export type U_config_plans_plan_entity_remove_duplicates_Params = z.infer<typeof z_U_config_plans_plan_entity_remove_duplicates_Params>


//
export async function RemoveDuplicates(step: TStep, _$context?: Partial<TContext>): Promise<DataTable> {

    Assert.Var<U_config_plans_plan_entity_remove_duplicates_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_remove_duplicates_Params.safeParse(step.stepArgs).success,
        `${STEP.REMOVE_DUPLICATE}: Wrong argument passed`)

    const { keys, method, strategy, condition } = step.stepArgs

    const { currentDataTable } = step

    await DataTableUtils.RemoveDuplicates(currentDataTable, keys, method, strategy, condition)

    Logger.Debug(`${Logger.Out} ${STEP.REMOVE_DUPLICATE}: ${JsonUtils.Stringify(step.stepArgs)}`)
    return currentDataTable
}
