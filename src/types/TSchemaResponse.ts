 
//
//
//
//
//
import { HTTP_STATUS_CODE } from "../lib/Const"
import { DataTable } from "./DataTable"


export type TSchemaResponse = {
    schema: string
    entity?: string
    status: HTTP_STATUS_CODE.OK
    data: DataTable
}