//
//
//
import z from "zod"
//
import { z_TOrderBy } from "../../../types/DataTable"
import { z_T_JsPattern } from "../../../types/T_JsPattern"
import { z_TJson } from "../../../types/TJson"
import { JOIN_TYPE, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY } from "../../../utils/DataTableUtils"
import { z_U__plans_plan_run_ai_Params } from "../../ai-engine/types/U__plans_plan_run_ai_Params"
import { z_entity, z_schema, z_TSchemaRequestDelete, z_TSchemaRequestInsert, z_TSchemaRequestListEntities, z_TSchemaRequestSelect, z_TSchemaRequestUpdate } from "../../schema/types/TSchemaRequest"
import { z_U__on_error } from "./U__plans_plan_on_error"


////// Flow control

// Break
export const z_U__plans_plan_break_Params = z.union([
    z.null(),
    z_T_JsPattern,
])

export type U__plans_plan_break_Params = z.infer<typeof z_U__plans_plan_break_Params>

// Debug
export const z_U__plans_plan_debug_Params = z.union([
    z.string(),
    z.null(),
])

export type U__plans_plan_debug_Params = z.infer<typeof z_U__plans_plan_debug_Params>

// SetVar
export const z_U__plans_plan_set_var_Params = z.record(
    z.union([
        z.string(),
        z_T_JsPattern
    ]),
    z.union([
        z.string(),
        z.number(),
        z_TJson,
        z_T_JsPattern
    ])
)

export type U__plans_plan_set_var_Params = z.infer<typeof z_U__plans_plan_set_var_Params>



////// Source & CRUD

// Select
export const z_U__plans_plan_select_Params = z.union([
    z_TSchemaRequestSelect
        .partial()
        .merge(z_U__on_error),
    z_TSchemaRequestSelect
        .omit({ schema: true, entity: true })
        .partial()
        .merge(z_U__on_error),
    z_U__on_error
        .required(),
    z.null(),
])

export type U__plans_plan_select_Params = z.infer<typeof z_U__plans_plan_select_Params>

// Insert
export const z_U__plans_plan_insert_Params = z.union([
    z_TSchemaRequestInsert
        .partial()
        .merge(z_U__on_error),
    z_TSchemaRequestInsert
        .omit({ schema: true, entity: true })
        .partial()
        .merge(z_U__on_error),
    z_U__on_error
        .required(),
    z.null(),
])

export type U__plans_plan_insert_Params = z.infer<typeof z_U__plans_plan_insert_Params>

// Update
export const z_U__plans_plan_update_Params = z.union([
    z_TSchemaRequestUpdate
        .partial()
        .merge(z_U__on_error),
    z_TSchemaRequestUpdate
        .omit({ schema: true, entity: true })
        .partial()
        .merge(z_U__on_error),
    z_U__on_error
        .required(),
    z.null(),
])

export type U__plans_plan_update_Params = z.infer<typeof z_U__plans_plan_update_Params>

// Delete
export const z_U__plans_plan_delete_Params = z.union([
    z_TSchemaRequestDelete
        .partial()
        .merge(z_U__on_error),
    z_TSchemaRequestDelete
        .omit({ schema: true, entity: true })
        .partial()
        .merge(z_U__on_error),
    z_U__on_error
        .required(),
    z.null(),
])

export type U__plans_plan_delete_Params = z.infer<typeof z_U__plans_plan_delete_Params>

// ListEntities
export const z_U__plans_plan_list_entities_Params = z.union([
    z_TSchemaRequestListEntities
        .merge(z_U__on_error),
    z_U__on_error
        .required(),
    z.null(),
])

export type U__plans_plan_list_entities_Params = z.infer<typeof z_U__plans_plan_list_entities_Params>

////// Data manipulation

// Anonymize
export const z_U__plans_plan_anonymize_Params = z
    .object({
        fields: z.array(
            z.union([
                z.string(),
                z_T_JsPattern
            ])
        )
            .min(1, "At least one field must be specified")
    })
    .merge(z_U__on_error)

export type U__plans_plan_anonymize_Params = z.infer<typeof z_U__plans_plan_anonymize_Params>

// Join
export const z_U__plans_plan_join_Params = z
    .object({
        type: z.union([
            z.enum(JOIN_TYPE),
            z_T_JsPattern
        ]),
        schema: z.union([
            z_schema,
            z_T_JsPattern
        ]),
        entity: z.union([
            z_entity,
            z_T_JsPattern
        ]),
        "left-field": z.union([
            z.string(),
            z_T_JsPattern
        ]),
        "right-field": z.union([
            z.string(),
            z_T_JsPattern
        ]),
    })
    .merge(z_U__on_error)

export type U__plans_plan_join_Params = z.infer<typeof z_U__plans_plan_join_Params>

// MapRows (Map)
export const z_U__plans_plan_map_Params = z
    .object({
        script: z.union([
            z.string()
                .min(1, "Script is required for map operation"),
            z_T_JsPattern
        ])
    })
    .merge(z_U__on_error)

export type U__plans_plan_map_Params = z.infer<typeof z_U__plans_plan_map_Params>

// Omit
export const z_U__plans_plan_omit_Params = z
    .object({
        fields: z.array(
            z.union([
                z.string(),
                z_T_JsPattern
            ])
        )
            .min(1, { message: "At least one field must be specified" })
    })
    .merge(z_U__on_error)

export type U__plans_plan_omit_Params = z.infer<typeof z_U__plans_plan_omit_Params>

// Pick
export const z_U__plans_plan_pick_Params = z
    .object({
        fields: z.array(
            z.union([
                z.string(),
                z_T_JsPattern
            ])
        )
            .min(1, { message: "At least one field must be specified" })
    })
    .merge(z_U__on_error)

export type U__plans_plan_pick_Params = z.infer<typeof z_U__plans_plan_pick_Params>

// RemoveDuplicates
export const z_U__plans_plan_remove_duplicates_Params = z
    .union([
        z.object({
            key: z.array(
                z.union([
                    z.string(),
                    z_T_JsPattern
                ])
            )
                .optional(),
            method: z.union([
                z.enum(REMOVE_DUPLICATES_METHOD),
                z_T_JsPattern
            ])
                .optional(),
            strategy: z.union([
                z.literal(REMOVE_DUPLICATES_STRATEGY.FIRST),
                z.literal(REMOVE_DUPLICATES_STRATEGY.LAST),
                z_T_JsPattern
            ])
                .optional(),
            condition: z.undefined(),
        }),
        z.object({
            key: z.array(
                z.union([
                    z.string(),
                    z_T_JsPattern
                ])
            )
                .optional(),
            method: z.union([
                z.enum(REMOVE_DUPLICATES_METHOD),
                z_T_JsPattern
            ])
                .optional(),
            strategy: z.union([
                z.literal(REMOVE_DUPLICATES_STRATEGY.LOWEST),
                z.literal(REMOVE_DUPLICATES_STRATEGY.HIGHEST),
                z.literal(REMOVE_DUPLICATES_STRATEGY.CUSTOM),
                z_T_JsPattern
            ])
                .optional(),
            condition: z.union([
                z.string(),
                z_T_JsPattern
            ]),
        }),
    ])
    .and(z_U__on_error)

export type U__plans_plan_remove_duplicates_Params = z.infer<typeof z_U__plans_plan_remove_duplicates_Params>


// Run
export const z_U__plans_plan_run_Params = z.object({
    ai: z.union([
        z.string(),
        z_T_JsPattern
    ]),
    input: z.union([
        z.string(),
        z_T_JsPattern
    ]),
    output: z.union([
        z.string(),
        z_T_JsPattern,
        z_TJson,
        z.null()
    ])
        .default(null),
})
    .and(z_U__plans_plan_run_ai_Params)
    .and(z_U__on_error)

export type U__plans_plan_run_Params = z.infer<typeof z_U__plans_plan_run_Params>


// Sort
export const z_U__plans_plan_sort_Params = z.object({
    fields: z_TOrderBy
})
    .merge(z_U__on_error)

export type U__plans_plan_sort_Params = z.infer<typeof z_U__plans_plan_sort_Params>


// Sync
export const z_U__plans_plan_sync_Params = z.object({
    from: z.object({
        schema: z.union([
            z_schema,
            z_T_JsPattern
        ]),
        entity: z.union([
            z_entity,
            z_T_JsPattern
        ]),
    }),
    to: z.object({
        schema: z.union([
            z_schema,
            z_T_JsPattern
        ]),
        entity: z.union([
            z_entity,
            z_T_JsPattern
        ]),
    }),
    id: z.union([
        z.string(),
        z_T_JsPattern
    ]),
})
    .merge(z_U__on_error)

export type U__plans_plan_sync_Params = z.infer<typeof z_U__plans_plan_sync_Params>

// Clear
export const z_U__plans_plan_clear_Params = z.null()

export type U__plans_plan_clear_Params = z.infer<typeof z_U__plans_plan_clear_Params>

// RemoveEmptyFields
export const z_U__plans_plan_remove_empty_fields_field_Params = z.object({
    "null": z.boolean().optional(),
    "empty-string": z.boolean().optional(),
    "blank-string": z.boolean().optional(),
    "string-null": z.boolean().optional(),
    "zero": z.boolean().optional(),
    "false": z.boolean().optional(),
    "empty-array": z.boolean().optional(),
    "empty-object": z.boolean().optional(),
})

export const z_U__plans_plan_remove_empty_fields_Params = z.object({
    defaults: z_U__plans_plan_remove_empty_fields_field_Params
        .strict()
        .default({
            "null": false,
            "empty-string": false,
            "blank-string": false,
            "string-null": false,
            "zero": false,
            "false": false,
            "empty-array": false,
            "empty-object": false,
        }),
    fields: z.record(
        z.union([
            z.string(),
            z_T_JsPattern
        ]),
        z.union([
            z.null(),
            z_U__plans_plan_remove_empty_fields_field_Params
        ]),
    )
        .optional()
})
    .strict()
    .merge(z_U__on_error)


export type U__plans_plan_remove_empty_fields_Params = z.infer<typeof z_U__plans_plan_remove_empty_fields_Params>

