//
//
//
//
//
import { DataTable, TOrderBy } from "../../../types/DataTable"
import { TJson } from "../../../types/TJson"


//
export type TOptionalParameter = {
    Fields?: string[]
    Filter?: TJson | string
    Sort?: TOrderBy
    Data?: DataTable
    Cache?: number
}