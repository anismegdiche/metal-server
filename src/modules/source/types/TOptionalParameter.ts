//
//
//
//
//
import type { DataTable, TOrderBy } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"


//
export type TOptionalParameter = {
    Fields?: string[]
    Filter?: TJson | string
    Sort?: TOrderBy
    Data?: DataTable
    Cache?: number
}