//
//
//
import type { DataTable, TOrderBy } from "../../types/DataTable"
import type { TJson } from "../../types/TJson"
import type { U__sources_source } from "../core/types/U__sources"
import type { DATA_ENTITY_TYPE } from "./@consts"
import type { IDataProvider } from "./base/IDataProvider"

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

export type TSource = {
	SourceConfig: U__sources_source
	DataProvider: IDataProvider
}
