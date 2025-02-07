//
//
//
//
//
import { DataTable } from "./DataTable"
import { TJson } from "./TJson"


//
export type TOptionalParameter = {
    Fields?: string
    Filter?: TJson | TJson[] | string
    Sort?: TJson | string
    Data?: DataTable
    Cache?: number
}