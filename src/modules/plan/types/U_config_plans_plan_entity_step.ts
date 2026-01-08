//
//
//
import z from "zod"
//
import { z_TOrderBy } from "../../../types/DataTable"
import { z_TJson } from "../../../types/TJson"
import { JOIN_TYPE, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY } from "../../../utils/DataTableUtils"
import { z_U_config_plans_plan_entity_run_ai_Params } from "../../ai-engine/types/U_config_plans_plan_entity_run_ai_Params"
import { z_TSchemaRequestDelete, z_TSchemaRequestInsert, z_TSchemaRequestListEntities, z_TSchemaRequestSelect, z_TSchemaRequestUpdate } from "../../schema/types/TSchemaRequest"
import { STEP } from "../@consts"


// flow control
export const z_U_config_plans_plan_entity_debug_Params = z.union([
    z.string(),
    z.null()
]);
export const z_U_config_plans_plan_entity_break_Params = z.null();


// schema/source
export const z_U_config_plans_plan_entity_select_Params = z.union([
    z_TSchemaRequestSelect,
    z_TSchemaRequestSelect.omit({ schema: true, source: true }),
    z_TSchemaRequestSelect.omit({ schema: true, entity: true, source: true })
]);

export const z_U_config_plans_plan_entity_update_Params = z.union([
    z_TSchemaRequestUpdate,
    z_TSchemaRequestUpdate.omit({ schema: true, source: true }),
    z_TSchemaRequestUpdate.omit({ schema: true, entity: true, source: true })
]);

export const z_U_config_plans_plan_entity_delete_Params = z.union([
    z_TSchemaRequestDelete,
    z_TSchemaRequestDelete.omit({ schema: true, source: true }),
    z_TSchemaRequestDelete.omit({ schema: true, entity: true, source: true })
]);

export const z_U_config_plans_plan_entity_insert_Params = z.union([
    z_TSchemaRequestInsert,
    z_TSchemaRequestInsert.omit({ schema: true, source: true }),
    z_TSchemaRequestInsert.omit({ schema: true, entity: true, source: true })
]);

export const z_U_config_plans_plan_entity_list_entities_Params = z.union([
    z.null(),
    z_TSchemaRequestListEntities
]);

export const z_U_config_plans_plan_entity_sync_Params = z.object({
    from: z.object({
        schema: z.string(),
        entity: z.string()
    }),
    to: z.object({
        schema: z.string(),
        entity: z.string()
    }),
    id: z.string(),
});
export const z_U_config_plans_plan_entity_join_Params = z.object({
    type: z.enum(JOIN_TYPE),
    schema: z.string().optional(),
    entity: z.string(),
    "left-field": z.string(),
    "right-field": z.string(),
});


// data
export const z_U_config_plans_plan_entity_sort_Params = z_TOrderBy;
export const z_U_config_plans_plan_entity_anonymize_Params = z.array(z.string());
export const z_U_config_plans_plan_entity_pick_Params = z.array(z.string());
export const z_U_config_plans_plan_entity_omit_Params = z.array(z.string());
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


// ai
export const z_U_config_plans_plan_entity_run_Params = z.object({
    ai: z.string(),
    input: z.string(),
    output: z.union([
        z.string(),
        z_TJson,
        z.null()
    ]).optional(),
}).and(z_U_config_plans_plan_entity_run_ai_Params);



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
    z_U_config_plans_plan_entity_run_Params,
]);

export const z_U_config_plans_plan_entity_step = z.union([
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
]).describe("Plan entity step");


//
export type U_config_plans_plan_entity_debug_Params = z.infer<typeof z_U_config_plans_plan_entity_debug_Params>
export type U_config_plans_plan_entity_break_Params = z.infer<typeof z_U_config_plans_plan_entity_break_Params>
export type U_config_plans_plan_entity_select_Params = z.infer<typeof z_U_config_plans_plan_entity_select_Params>
export type U_config_plans_plan_entity_update_Params = z.infer<typeof z_U_config_plans_plan_entity_update_Params>
export type U_config_plans_plan_entity_delete_Params = z.infer<typeof z_U_config_plans_plan_entity_delete_Params>
export type U_config_plans_plan_entity_insert_Params = z.infer<typeof z_U_config_plans_plan_entity_insert_Params>
export type U_config_plans_plan_entity_list_entities_Params = z.infer<typeof z_U_config_plans_plan_entity_list_entities_Params>
export type U_config_plans_plan_entity_sync_Params = z.infer<typeof z_U_config_plans_plan_entity_sync_Params>
export type U_config_plans_plan_entity_join_Params = z.infer<typeof z_U_config_plans_plan_entity_join_Params>
export type U_config_plans_plan_entity_sort_Params = z.infer<typeof z_U_config_plans_plan_entity_sort_Params>
export type U_config_plans_plan_entity_anonymize_Params = z.infer<typeof z_U_config_plans_plan_entity_anonymize_Params>
export type U_config_plans_plan_entity_omit_Params = z.infer<typeof z_U_config_plans_plan_entity_omit_Params>
export type U_config_plans_plan_entity_pick_Params = z.infer<typeof z_U_config_plans_plan_entity_pick_Params>
export type U_config_plans_plan_entity_remove_duplicates_Params = z.infer<typeof z_U_config_plans_plan_entity_remove_duplicates_Params>
export type U_config_plans_plan_entity_run_Params = z.infer<typeof z_U_config_plans_plan_entity_run_Params>
export type U_config_plans_plan_entity_step_Params = z.infer<typeof z_U_config_plans_plan_entity_step_Params>;


export type U_config_plans_plan_entity_step = z.infer<typeof z_U_config_plans_plan_entity_step>;

