import z from "zod"
//
import { z_TOrderBy } from "../../../types/DataTable"
import { z_T_IntPositive } from "../../../types/T_IntPositive"
import { z_TJson } from "../../../types/TJson"
import { z_U_config_plans_plan_entity_run_ai_Params } from "../../ai-engine/types/U_config_plans_plan_entity_run_ai_Params"
import {
    z_TSchemaRequestDelete,
    z_TSchemaRequestInsert,
    z_TSchemaRequestListEntities,
    z_TSchemaRequestSelect,
    z_TSchemaRequestUpdate,
} from "../../schema/types/TSchemaRequest"

// Enums (copied from source to avoid circular dependencies)
export enum MAP_ON_ERROR {
    THROW = "throw",
    MARK = "mark",
    SKIP = "skip",
}

export enum JOIN_TYPE {
    LEFT = "left",
    RIGHT = "right",
    INNER = "inner",
    FULL_OUTER = "full-outer",
    CROSS = "cross",
}

export enum REMOVE_DUPLICATES_METHOD {
    HASH = "hash",
    EXACT = "exact",
    IGNORE_CASE = "ignorecase",
}

export enum REMOVE_DUPLICATES_STRATEGY {
    FIRST = "first",
    LAST = "last",
    HIGHEST = "highest",
    LOWEST = "lowest",
    CUSTOM = "custom",
}

// Anonymize
export const z_U_config_plans_plan_entity_anonymize_Params = z.array(z.string())
export type U_config_plans_plan_entity_anonymize_Params = z.infer<typeof z_U_config_plans_plan_entity_anonymize_Params>

// Break
export const z_U_config_plans_plan_entity_break_Params = z.null()
export type U_config_plans_plan_entity_break_Params = z.infer<typeof z_U_config_plans_plan_entity_break_Params>

// Debug
export const z_U_config_plans_plan_entity_debug_Params = z.union([z.string(), z.null()])
export type U_config_plans_plan_entity_debug_Params = z.infer<typeof z_U_config_plans_plan_entity_debug_Params>

// Delete
export const z_U_config_plans_plan_entity_delete_Params = z.union([
    z_TSchemaRequestDelete,
    z_TSchemaRequestDelete.omit({ schema: true, source: true }),
    z_TSchemaRequestDelete.omit({ schema: true, entity: true, source: true }),
])
export type U_config_plans_plan_entity_delete_Params = z.infer<typeof z_U_config_plans_plan_entity_delete_Params>

// Insert
export const z_U_config_plans_plan_entity_insert_Params = z.union([
    z_TSchemaRequestInsert,
    z_TSchemaRequestInsert.omit({ schema: true, source: true }),
    z_TSchemaRequestInsert.omit({ schema: true, entity: true, source: true }),
])
export type U_config_plans_plan_entity_insert_Params = z.infer<typeof z_U_config_plans_plan_entity_insert_Params>

// Join
export const z_U_config_plans_plan_entity_join_Params = z.object({
    type: z.nativeEnum(JOIN_TYPE),
    schema: z.string().optional(),
    entity: z.string(),
    "left-field": z.string(),
    "right-field": z.string(),
})
export type U_config_plans_plan_entity_join_Params = z.infer<typeof z_U_config_plans_plan_entity_join_Params>

// ListEntities
export const z_U_config_plans_plan_entity_list_entities_Params = z.union([z.null(), z_TSchemaRequestListEntities])
export type U_config_plans_plan_entity_list_entities_Params = z.infer<
    typeof z_U_config_plans_plan_entity_list_entities_Params
>

// MapRows (Map)
export const z_U_config_plans_plan_entity_map_Params = z.object({
    script: z.string().min(1, "Script is required for map operation"),
    "on-error": z.nativeEnum(MAP_ON_ERROR).optional(),
})
export type U_config_plans_plan_entity_map_Params = z.infer<typeof z_U_config_plans_plan_entity_map_Params>

// Omit
export const z_U_config_plans_plan_entity_omit_Params = z.array(z.string())
export type U_config_plans_plan_entity_omit_Params = z.infer<typeof z_U_config_plans_plan_entity_omit_Params>

// Pick
export const z_U_config_plans_plan_entity_pick_Params = z.array(z.string())
export type U_config_plans_plan_entity_pick_Params = z.infer<typeof z_U_config_plans_plan_entity_pick_Params>

// RemoveDuplicates
export const z_U_config_plans_plan_entity_remove_duplicates_Params = z.union([
    z.object({
        keys: z.array(z.string()).optional(),
        method: z.nativeEnum(REMOVE_DUPLICATES_METHOD).optional(),
        strategy: z
            .union([z.literal(REMOVE_DUPLICATES_STRATEGY.FIRST), z.literal(REMOVE_DUPLICATES_STRATEGY.LAST)])
            .optional(),
        condition: z.undefined(),
    }),
    z.object({
        keys: z.array(z.string()).optional(),
        method: z.nativeEnum(REMOVE_DUPLICATES_METHOD).optional(),
        strategy: z
            .union([
                z.literal(REMOVE_DUPLICATES_STRATEGY.LOWEST),
                z.literal(REMOVE_DUPLICATES_STRATEGY.HIGHEST),
                z.literal(REMOVE_DUPLICATES_STRATEGY.CUSTOM),
            ])
            .optional(),
        condition: z.string(),
    }),
])
export type U_config_plans_plan_entity_remove_duplicates_Params = z.infer<
    typeof z_U_config_plans_plan_entity_remove_duplicates_Params
>

// Run
export const z_U_config_plans_plan_entity_run_Params = z
    .object({
        ai: z.string(),
        input: z.string(),
        output: z.union([z.string(), z_TJson, z.null()]).optional(),
    })
    .and(z_U_config_plans_plan_entity_run_ai_Params)
export type U_config_plans_plan_entity_run_Params = z.infer<typeof z_U_config_plans_plan_entity_run_Params>

// Select
export const z_U_config_plans_plan_entity_select_Params = z.union([
    z_TSchemaRequestSelect,
    z_TSchemaRequestSelect.omit({ schema: true, source: true }),
    z_TSchemaRequestSelect.omit({ schema: true, entity: true, source: true }),
])
export type U_config_plans_plan_entity_select_Params = z.infer<typeof z_U_config_plans_plan_entity_select_Params>

// SetVar
export const z_U_config_plans_plan_entity_set_var_Params = z_TJson
export type U_config_plans_plan_entity_set_var_Params = z.infer<typeof z_U_config_plans_plan_entity_set_var_Params>

// Sort
export const z_U_config_plans_plan_entity_sort_Params = z_TOrderBy
export type U_config_plans_plan_entity_sort_Params = z.infer<typeof z_U_config_plans_plan_entity_sort_Params>

// Sync
export const z_U_config_plans_plan_entity_sync_Params = z.object({
    from: z.object({
        schema: z.string(),
        entity: z.string(),
    }),
    to: z.object({
        schema: z.string(),
        entity: z.string(),
    }),
    id: z.string(),
})
export type U_config_plans_plan_entity_sync_Params = z.infer<typeof z_U_config_plans_plan_entity_sync_Params>

// Update
export const z_U_config_plans_plan_entity_update_Params = z.union([
    z_TSchemaRequestUpdate,
    z_TSchemaRequestUpdate.omit({ schema: true, source: true }),
    z_TSchemaRequestUpdate.omit({ schema: true, entity: true, source: true }),
])
export type U_config_plans_plan_entity_update_Params = z.infer<typeof z_U_config_plans_plan_entity_update_Params>
