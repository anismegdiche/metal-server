//
//
//
import { z } from "zod"
//
import { z_T_IntPositive } from "./T_IntPositive"
import { type TJson, z_TJson } from "./TJson"
import { z_TUuidv7 } from "./TUuidv7"


// Constants
export enum SORT_ORDER {
	ASC = "asc",
	DESC = "desc",
}

export enum DT_SYS_FIELDS {
	seq = "__seq__",
	idx = "__idx__",
	data = "__data__",
	deleted = "__deleted__",
	created_at = "__created_at__"
}

// Schemas
export const z_SORT_ORDER = z.enum(SORT_ORDER)

export const z_TOrderBy = z.record(
	z.string(),
	z_SORT_ORDER.optional()
)

export const z_TRow = z_TJson
	.and(
		z.object({
			[DT_SYS_FIELDS.seq]: z_T_IntPositive.optional(),
			[DT_SYS_FIELDS.idx]: z_TUuidv7.optional(),
			[DT_SYS_FIELDS.deleted]: z.boolean().optional(),
			[DT_SYS_FIELDS.created_at]: z.date().optional(),
		}),
	)

// Types
export type TRow = z.infer<typeof z_TRow>
export type TFields = TJson
export type TMetaData = Record<string, unknown>
export type TOrderBy = Record<string, SORT_ORDER | undefined>