//
//
//
import z from "zod"
//
import { STEP } from "../@consts"
import {
	z_U__plans_plan_anonymize_Params,
	z_U__plans_plan_break_Params,
	z_U__plans_plan_debug_Params,
	z_U__plans_plan_delete_Params,
	z_U__plans_plan_insert_Params,
	z_U__plans_plan_join_Params,
	z_U__plans_plan_list_entities_Params,
	z_U__plans_plan_map_Params,
	z_U__plans_plan_omit_Params,
	z_U__plans_plan_pick_Params,
	z_U__plans_plan_remove_duplicates_Params,
	z_U__plans_plan_run_Params,
	z_U__plans_plan_select_Params,
	z_U__plans_plan_set_var_Params,
	z_U__plans_plan_sort_Params,
	z_U__plans_plan_sync_Params,
	z_U__plans_plan_update_Params,
} from "./U__plans_params"

//
export const z_U__plans_plan__step_Params = z.union([
	z_U__plans_plan_debug_Params,
	z_U__plans_plan_break_Params,
	z_U__plans_plan_set_var_Params,
	z_U__plans_plan_select_Params,
	z_U__plans_plan_update_Params,
	z_U__plans_plan_delete_Params,
	z_U__plans_plan_insert_Params,
	z_U__plans_plan_list_entities_Params,
	z_U__plans_plan_sync_Params,
	z_U__plans_plan_join_Params,
	z_U__plans_plan_sort_Params,
	z_U__plans_plan_anonymize_Params,
	z_U__plans_plan_remove_duplicates_Params,
	z_U__plans_plan_pick_Params,
	z_U__plans_plan_omit_Params,
	z_U__plans_plan_map_Params,
	z_U__plans_plan_run_Params,
])

export const z_U__plans_plan__step = z.union([
	z.object({ [STEP.DEBUG]: z_U__plans_plan_debug_Params }),
	z.object({ [STEP.SELECT]: z_U__plans_plan_select_Params }),
	z.object({ [STEP.UPDATE]: z_U__plans_plan_update_Params }),
	z.object({ [STEP.DELETE]: z_U__plans_plan_delete_Params }),
	z.object({ [STEP.INSERT]: z_U__plans_plan_insert_Params }),
	z.object({ [STEP.JOIN]: z_U__plans_plan_join_Params }),
	z.object({ [STEP.SORT]: z_U__plans_plan_sort_Params }),
	z.object({ [STEP.RUN]: z_U__plans_plan_run_Params }),
	z.object({ [STEP.SYNC]: z_U__plans_plan_sync_Params }),
	z.object({ [STEP.ANONYMIZE]: z_U__plans_plan_anonymize_Params }),
	z.object({ [STEP.REMOVE_DUPLICATE]: z_U__plans_plan_remove_duplicates_Params }),
	z.object({ [STEP.LIST_ENTITIES]: z_U__plans_plan_list_entities_Params }),
	z.object({ [STEP.BREAK]: z_U__plans_plan_break_Params }),
	z.object({ [STEP.PICK]: z_U__plans_plan_pick_Params }),
	z.object({ [STEP.OMIT]: z_U__plans_plan_omit_Params }),
	z.object({ [STEP.MAP]: z_U__plans_plan_map_Params }),
	z.object({ [STEP.SET_VAR]: z_U__plans_plan_set_var_Params }),
])

//
export type U__plans_plan__step_Params = z.infer<typeof z_U__plans_plan__step_Params>
export type U__plans_plan__step = z.infer<typeof z_U__plans_plan__step>
