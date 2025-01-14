//
//
//
//
//
import { DataTable } from "./DataTable"
import { TJson } from "./TJson"


//
export type TOptions  = {
    Fields?: TJson | string
    Filter?: TJson
    Sort?: TJson | string
    Data?: DataTable
    Cache?: number
}