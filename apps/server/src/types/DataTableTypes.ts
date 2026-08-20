//
//
//
import { type TJson, z_T_IntPositive, z_T_JsPattern, z_TJson, z_TUuidv7 } from "@metal/types"
import { z } from "zod"


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
	created_at = "__created_at__",
}

// Schemas
export const z_SORT_ORDER = z.enum(SORT_ORDER)

export const z_TOrderBy = z.record(
	z.union([z.string(), z_T_JsPattern]),
	z.union([z_SORT_ORDER, z_T_JsPattern, z.null()]),
)
export type TOrderBy = z.infer<typeof z_TOrderBy>

export const z_TRow = z_TJson.and(
	z.object({
		[DT_SYS_FIELDS.seq]: z_T_IntPositive.optional(),
		[DT_SYS_FIELDS.idx]: z_TUuidv7.optional(),
		[DT_SYS_FIELDS.deleted]: z.boolean().optional(),
		[DT_SYS_FIELDS.created_at]: z.date().optional(),
	}),
)

export type TSnapshotInfo = {
	name: string
	created_at: Date
}

// Types
export type TRow = z.infer<typeof z_TRow>
export type TFields = TJson
export type TMetaData = Record<string, unknown>
