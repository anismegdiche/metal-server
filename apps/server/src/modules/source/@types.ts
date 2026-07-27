//
//
//
import type { TJson } from "@metal/types"
import type { DataTable, TOrderBy } from "../../types/DataTable"
import type { DATA_ENTITY_TYPE } from "./@consts"


//
export type TDataListEntity = {
	name: string
	type: DATA_ENTITY_TYPE
	size?: number
	meta?: Record<string, any>
}

export type TOptionalParameter = {
	Fields?: string[]
	Filter?: TJson | string
	Sort?: TOrderBy
	Data?: DataTable
	Cache?: number
}


