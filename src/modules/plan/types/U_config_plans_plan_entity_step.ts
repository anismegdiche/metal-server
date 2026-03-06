//
//
//
import z from "zod"
//
import { STEP } from "../@consts"
import {
	z_U_config_plans_plan_entity_anonymize_Params,
	z_U_config_plans_plan_entity_break_Params,
	z_U_config_plans_plan_entity_debug_Params,
	z_U_config_plans_plan_entity_delete_Params,
	z_U_config_plans_plan_entity_insert_Params,
	z_U_config_plans_plan_entity_join_Params,
	z_U_config_plans_plan_entity_list_entities_Params,
	z_U_config_plans_plan_entity_map_Params,
	z_U_config_plans_plan_entity_omit_Params,
	z_U_config_plans_plan_entity_pick_Params,
	z_U_config_plans_plan_entity_remove_duplicates_Params,
	z_U_config_plans_plan_entity_run_Params,
	z_U_config_plans_plan_entity_select_Params,
	z_U_config_plans_plan_entity_set_var_Params,
	z_U_config_plans_plan_entity_sort_Params,
	z_U_config_plans_plan_entity_sync_Params,
	z_U_config_plans_plan_entity_update_Params,
} from "./U_config_plans_params"

//
export const z_U_config_plans_plan_entity_step_Params = z.union([
	z_U_config_plans_plan_entity_debug_Params,
	z_U_config_plans_plan_entity_break_Params,
	z_U_config_plans_plan_entity_select_Params,
	z_U_config_plans_plan_entity_update_Params,
	z_U_config_plans_plan_entity_delete_Params,
	z_U_config_plans_plan_entity_insert_Params,
	z_U_config_plans_plan_entity_list_entities_Params,
	z_U_config_plans_plan_entity_sync_Params,
	z_U_config_plans_plan_entity_join_Params,
	z_U_config_plans_plan_entity_sort_Params,
	z_U_config_plans_plan_entity_anonymize_Params,
	z_U_config_plans_plan_entity_remove_duplicates_Params,
	z_U_config_plans_plan_entity_pick_Params,
	z_U_config_plans_plan_entity_omit_Params,
	z_U_config_plans_plan_entity_map_Params,
	z_U_config_plans_plan_entity_run_Params,
	z_U_config_plans_plan_entity_set_var_Params,
])

export const z_U_config_plans_plan_entity_step = z
	.union([
		z.object({ [STEP.DEBUG]: z_U_config_plans_plan_entity_debug_Params }),
		z.object({ [STEP.SELECT]: z_U_config_plans_plan_entity_select_Params }),
		z.object({ [STEP.UPDATE]: z_U_config_plans_plan_entity_update_Params }),
		z.object({ [STEP.DELETE]: z_U_config_plans_plan_entity_delete_Params }),
		z.object({ [STEP.INSERT]: z_U_config_plans_plan_entity_insert_Params }),
		z.object({ [STEP.JOIN]: z_U_config_plans_plan_entity_join_Params }),
		z.object({ [STEP.SORT]: z_U_config_plans_plan_entity_sort_Params }),
		z.object({ [STEP.RUN]: z_U_config_plans_plan_entity_run_Params }),
		z.object({ [STEP.SYNC]: z_U_config_plans_plan_entity_sync_Params }),
		z.object({ [STEP.ANONYMIZE]: z_U_config_plans_plan_entity_anonymize_Params }),
		z.object({ [STEP.REMOVE_DUPLICATE]: z_U_config_plans_plan_entity_remove_duplicates_Params }),
		z.object({ [STEP.LIST_ENTITIES]: z_U_config_plans_plan_entity_list_entities_Params }),
		z.object({ [STEP.BREAK]: z_U_config_plans_plan_entity_break_Params }),
		z.object({ [STEP.PICK]: z_U_config_plans_plan_entity_pick_Params }),
		z.object({ [STEP.OMIT]: z_U_config_plans_plan_entity_omit_Params }),
		z.object({ [STEP.MAP]: z_U_config_plans_plan_entity_map_Params }),
		z.object({ [STEP.SET_VAR]: z_U_config_plans_plan_entity_set_var_Params }),
	])
	.describe("Plan entity step")

//
export type U_config_plans_plan_entity_step_Params = z.infer<typeof z_U_config_plans_plan_entity_step_Params>
export type U_config_plans_plan_entity_step = z.infer<typeof z_U_config_plans_plan_entity_step>
