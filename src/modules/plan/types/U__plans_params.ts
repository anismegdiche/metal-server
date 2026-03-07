import z from "zod"
//
import { z_TOrderBy } from "../../../types/DataTable"
import { z_TJson } from "../../../types/TJson"
import { z_U__plans_plan_run_ai_Params } from "../../ai-engine/types/U__plans_plan_run_ai_Params"
import {
    z_TSchemaRequestDelete,
    z_TSchemaRequestInsert,
    z_TSchemaRequestListEntities,
    z_TSchemaRequestSelect,
    z_TSchemaRequestUpdate,
} from "../../schema/types/TSchemaRequest"
import { z_U__step_on_error } from "./U__plans_plan_on_error"

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
export const z_U__plans_plan_anonymize_Params = z.object({
    fields: z.array(z.string())
})
    .and(z_U__step_on_error.optional())

export type U__plans_plan_anonymize_Params = z.infer<typeof z_U__plans_plan_anonymize_Params>

// Break
export const z_U__plans_plan_break_Params = z.null()

export type U__plans_plan_break_Params = z.infer<typeof z_U__plans_plan_break_Params>

// Debug
export const z_U__plans_plan_debug_Params = z.union([z.string(), z.null()])

export type U__plans_plan_debug_Params = z.infer<typeof z_U__plans_plan_debug_Params>

// Delete
export const z_U__plans_plan_delete_Params = z.union([
    z_TSchemaRequestDelete,
    z_TSchemaRequestDelete.omit({ schema: true, source: true }),
    z_TSchemaRequestDelete.omit({ schema: true, entity: true, source: true }),
])
    .and(z_U__step_on_error.optional())

export type U__plans_plan_delete_Params = z.infer<typeof z_U__plans_plan_delete_Params>

// Insert
export const z_U__plans_plan_insert_Params = z.union([
    z_TSchemaRequestInsert,
    z_TSchemaRequestInsert.omit({ schema: true, source: true }),
    z_TSchemaRequestInsert.omit({ schema: true, entity: true, source: true }),
])
    .and(z_U__step_on_error.optional())

export type U__plans_plan_insert_Params = z.infer<typeof z_U__plans_plan_insert_Params>

// Join
export const z_U__plans_plan_join_Params = z.object({
    type: z.enum(JOIN_TYPE),
    schema: z.string().optional(),
    entity: z.string(),
    "left-field": z.string(),
    "right-field": z.string(),
})
    .and(z_U__step_on_error.optional())

export type U__plans_plan_join_Params = z.infer<typeof z_U__plans_plan_join_Params>

// ListEntities
export const z_U__plans_plan_list_entities_Params = z.union([
    z.null(),
    z_U__step_on_error,
    z_TSchemaRequestListEntities.and(z_U__step_on_error.optional())
])

export type U__plans_plan_list_entities_Params = z.infer<typeof z_U__plans_plan_list_entities_Params>

// MapRows (Map)
export const z_U__plans_plan_map_Params = z.object({
    script: z.string().min(1, "Script is required for map operation"),
})
    .and(z_U__step_on_error.optional())

export type U__plans_plan_map_Params = z.infer<typeof z_U__plans_plan_map_Params>

// Omit
export const z_U__plans_plan_omit_Params = z.object({
    fields: z.array(z.string())
})
    .and(z_U__step_on_error.optional())

export type U__plans_plan_omit_Params = z.infer<typeof z_U__plans_plan_omit_Params>

// Pick
export const z_U__plans_plan_pick_Params = z.object({
    fields: z.array(z.string())
})
    .and(z_U__step_on_error.optional())

export type U__plans_plan_pick_Params = z.infer<typeof z_U__plans_plan_pick_Params>

// RemoveDuplicates
export const z_U__plans_plan_remove_duplicates_Params = z.union([
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
        method: z.enum(REMOVE_DUPLICATES_METHOD).optional(),
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
    .and(z_U__step_on_error.optional())

export type U__plans_plan_remove_duplicates_Params = z.infer<typeof z_U__plans_plan_remove_duplicates_Params>

// Run
export const z_U__plans_plan_run_Params = z
    .object({
        ai: z.string(),
        input: z.string(),
        output: z.union([z.string(), z_TJson, z.null()]).optional(),
    })
    .and(z_U__plans_plan_run_ai_Params)
    .and(z_U__step_on_error.optional())

export type U__plans_plan_run_Params = z.infer<typeof z_U__plans_plan_run_Params>

// Select
export const z_U__plans_plan_select_Params = z.union([
    z_TSchemaRequestSelect,
    z_TSchemaRequestSelect.omit({ schema: true, source: true }),
    z_TSchemaRequestSelect.omit({ schema: true, entity: true, source: true }),
])
    .and(z_U__step_on_error.optional())

export type U__plans_plan_select_Params = z.infer<typeof z_U__plans_plan_select_Params>

// SetVar
export const z_U__plans_plan_set_var_Params = z_TJson
export type U__plans_plan_set_var_Params = z.infer<typeof z_U__plans_plan_set_var_Params>

// Sort
export const z_U__plans_plan_sort_Params = z_TOrderBy
    .and(z_U__step_on_error.optional())

export type U__plans_plan_sort_Params = z.infer<typeof z_U__plans_plan_sort_Params>

// Sync
export const z_U__plans_plan_sync_Params = z.object({
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
    .and(z_U__step_on_error.optional())

export type U__plans_plan_sync_Params = z.infer<typeof z_U__plans_plan_sync_Params>

// Update
export const z_U__plans_plan_update_Params = z.union([
    z_TSchemaRequestUpdate,
    z_TSchemaRequestUpdate.omit({ schema: true, source: true }),
    z_TSchemaRequestUpdate.omit({ schema: true, entity: true, source: true }),
])
    .and(z_U__step_on_error.optional())

export type U__plans_plan_update_Params = z.infer<typeof z_U__plans_plan_update_Params>
