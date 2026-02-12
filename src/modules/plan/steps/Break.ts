//
//
//
import z from "zod"
//
import { Assert } from "../../../utils/Assert"
import type { TContext } from "../../sandbox/types/TContext"
import { STEP } from "../@consts"
import type { TStep } from "../types/TStep"


//
export const z_U_config_plans_plan_entity_break_Params = z.null();


//
export type U_config_plans_plan_entity_break_Params = z.infer<typeof z_U_config_plans_plan_entity_break_Params>


//
export async function Break(step: TStep, _$context?: Partial<TContext>): Promise<undefined> {
    Assert.Var<U_config_plans_plan_entity_break_Params>(step.stepArgs,
        z_U_config_plans_plan_entity_break_Params.safeParse(step.stepArgs).success,
        `${STEP.BREAK}: Wrong argument passed`)
    throw new Error("__BREAK__")
}
