//
//
//
//
//
import { DataTable, TOrderBy } from "./DataTable"
import { TJson } from "./TJson"


//
export type TOptionalParameter = {
    Fields?: string
    Filter?: TJson | TJson[] | string
    Sort?: TOrderBy
    Data?: DataTable
    Cache?: number
}