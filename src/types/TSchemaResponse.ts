 
//
//
//
//
//
import { HTTP_STATUS_CODE } from "../lib/Const"
import { DataTable } from "./DataTable"


export type TSchemaResponse = {
    schemaName: string
    entityName?: string
    result: string
    status: HTTP_STATUS_CODE.OK
    cache?: string
    expires?: number
    data: DataTable
}