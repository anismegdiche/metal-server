//
//
//
import z from "zod"
//
import { z_TOrderBy } from "../../../types/DataTable"
import { z_TJson } from "../../../types/TJson"
import { z_U__plans_plan_run_ai_Params } from "../../ai-engine/types/U__plans_plan_run_ai_Params"
import { z_TSchemaRequestDelete, z_TSchemaRequestInsert, z_TSchemaRequestListEntities, z_TSchemaRequestSelect, z_TSchemaRequestUpdate } from "../../schema/types/TSchemaRequest"
import { z_U__on_error } from "./U__plans_plan_on_error"


//
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



////// Flow control

// Break
export const z_U__plans_plan_break_Params = z
    .null()
    .describe("Break operation parameters")

export type U__plans_plan_break_Params = z.infer<typeof z_U__plans_plan_break_Params>

// Debug
export const z_U__plans_plan_debug_Params = z
    .union([
        z.string()
            .describe("Debug message"),
        z.null()
            .describe("No debug message")
    ])
    .describe("Debug operation parameters")

export type U__plans_plan_debug_Params = z.infer<typeof z_U__plans_plan_debug_Params>

// SetVar
export const z_U__plans_plan_set_var_Params = z_TJson
export type U__plans_plan_set_var_Params = z.infer<typeof z_U__plans_plan_set_var_Params>



////// Source & CRUD

// Select
export const z_U__plans_plan_select_Params = z_TSchemaRequestSelect
    .partial()
    .and(
        z_U__on_error
            .optional()
    )
    .describe("Select operation parameters")

export type U__plans_plan_select_Params = z.infer<typeof z_U__plans_plan_select_Params>

// Insert
export const z_U__plans_plan_insert_Params = z_TSchemaRequestInsert
    .partial()
    .and(
        z_U__on_error
            .optional()
    )
    .describe("Insert operation parameters")

export type U__plans_plan_insert_Params = z.infer<typeof z_U__plans_plan_insert_Params>

// Update
export const z_U__plans_plan_update_Params = z_TSchemaRequestUpdate
    .partial()
    .and(
        z_U__on_error
            .optional()
    )
    .describe("Update operation parameters")

export type U__plans_plan_update_Params = z.infer<typeof z_U__plans_plan_update_Params>

// Delete
export const z_U__plans_plan_delete_Params = z_TSchemaRequestDelete
    .partial()
    .and(
        z_U__on_error
            .optional()
    )
    .describe("Delete operation parameters")

export type U__plans_plan_delete_Params = z.infer<typeof z_U__plans_plan_delete_Params>

////// Data manipulation

// Anonymize
export const z_U__plans_plan_anonymize_Params = z
    .object({
        fields: z
            .array(z
                .string()
                .describe("Field name to anonymize")
            )
            .min(1, "At least one field must be specified")
            .describe("Fields to anonymize")
    })
    .and(
        z_U__on_error
            .optional()
    )
    .describe("Anonymize operation parameters")

export type U__plans_plan_anonymize_Params = z.infer<typeof z_U__plans_plan_anonymize_Params>

// Join
export const z_U__plans_plan_join_Params = z
    .object({
        type: z
            .enum(JOIN_TYPE),
        schema: z
            .string()
            .optional(),
        entity: z
            .string(),
        "left-field": z
            .string(),
        "right-field": z
            .string(),
    })
    .and(
        z_U__on_error
            .optional()
    )
    .describe("Join operation parameters")

export type U__plans_plan_join_Params = z.infer<typeof z_U__plans_plan_join_Params>

// ListEntities
export const z_U__plans_plan_list_entities_Params = z
    .union([
        z.null(),
        z_U__on_error,
        z_TSchemaRequestListEntities
            .and(
                z_U__on_error
                    .optional()
            )
    ])
    .describe("List entities operation parameters")

export type U__plans_plan_list_entities_Params = z.infer<typeof z_U__plans_plan_list_entities_Params>

// MapRows (Map)
export const z_U__plans_plan_map_Params = z
    .object({
        script: z
            .string()
            .min(1, "Script is required for map operation"),
    })
    .and(
        z_U__on_error
            .optional()
    )
    .describe("Map operation parameters")

export type U__plans_plan_map_Params = z.infer<typeof z_U__plans_plan_map_Params>

// Omit
export const z_U__plans_plan_omit_Params = z
    .object({
        fields: z
            .array(z
                .string()
                .describe("Field name to omit")
            )
            .min(1, { message: "At least one field must be specified" })
            .describe("Fields to omit")
    })
    .and(
        z_U__on_error
            .optional()
    )
    .describe("Omit operation parameters")

export type U__plans_plan_omit_Params = z.infer<typeof z_U__plans_plan_omit_Params>

// Pick
export const z_U__plans_plan_pick_Params = z
    .object({
        fields: z
            .array(z
                .string()
                .describe("Field name to pick")
            )
            .min(1, { message: "At least one field must be specified" })
            .describe("Fields to pick")
    })
    .and(
        z_U__on_error
            .optional()
    )
    .describe("Pick operation parameters")

export type U__plans_plan_pick_Params = z.infer<typeof z_U__plans_plan_pick_Params>

// RemoveDuplicates
export const z_U__plans_plan_remove_duplicates_Params = z
    .union([
        z.object({
            keys: z
                .array(z
                    .string()
                    .describe("Key to remove duplicates by")
                )
                .optional(),
            method: z
                .enum(REMOVE_DUPLICATES_METHOD)
                .optional(),
            strategy: z
                .union([
                    z.literal(REMOVE_DUPLICATES_STRATEGY.FIRST),
                    z.literal(REMOVE_DUPLICATES_STRATEGY.LAST)
                ])
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
    .and(z_U__on_error.optional())

export type U__plans_plan_remove_duplicates_Params = z.infer<typeof z_U__plans_plan_remove_duplicates_Params>

// Run
export const z_U__plans_plan_run_Params = z
    .object({
        ai: z.string(),
        input: z.string(),
        output: z.union([z.string(), z_TJson, z.null()]).optional(),
    })
    .and(z_U__plans_plan_run_ai_Params)
    .and(z_U__on_error.optional())

export type U__plans_plan_run_Params = z.infer<typeof z_U__plans_plan_run_Params>



// Sort
export const z_U__plans_plan_sort_Params = z_TOrderBy
    .and(z_U__on_error.optional())

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
    .and(z_U__on_error.optional())

export type U__plans_plan_sync_Params = z.infer<typeof z_U__plans_plan_sync_Params>

