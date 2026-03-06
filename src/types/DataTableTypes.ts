//
//
//
import { z } from "zod"
import { z_T_IntPositive } from "./T_IntPositive"
import { type TJson, z_TJson } from "./TJson"
import { z_TUuidv7 } from "./TUuidv7"


// Constants
export enum SORT_ORDER {
    ASC = "asc",
    DESC = "desc",
}


// Schemas
export const z_SORT_ORDER = z.enum(["asc", "desc"])

export const z_TOrderBy = z.record(z.string(), z_SORT_ORDER.optional())

export const z_TRow = z_TJson.and(
    z.object({
        __seq__: z_T_IntPositive.optional(),
        __idx__: z_TUuidv7.optional(),
    }),
)


// Types
export type TRow = z.infer<typeof z_TRow>
export type TFields = TJson
export type TMetaData = Record<string, unknown>
export type TOrderBy = Record<string, SORT_ORDER | undefined>
