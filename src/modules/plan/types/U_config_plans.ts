//
//
//
import z from "zod"
//
import { z_U_config_plans_plan_entity_step } from "./U_config_plans_plan_entity_step";


//
export const z_U_config_plans_plan_entity_steps = z.array(
    z_U_config_plans_plan_entity_step
);


export const z_U_config_plans_plan = z.record(
    z.string("Entity name is required").describe("entityName"),
    z_U_config_plans_plan_entity_steps
)

export const z_U_config_plans = z.record(
    z.string("Plan name is required").describe("planName"),
    z_U_config_plans_plan
);


//
export type U_config_plans_plan_entity_steps = z.infer<typeof z_U_config_plans_plan_entity_steps>
export type U_config_plans_plan = z.infer<typeof z_U_config_plans_plan>
export type U_config_plans = z.infer<typeof z_U_config_plans>

