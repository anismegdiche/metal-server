 
//
//
//
//
//
import { HTTP_STATUS_CODE } from "../../core/@consts"
import { DataTable } from "../../../types/DataTable"


export type TSchemaResponse = {
    schema: string
    entity?: string
    status: HTTP_STATUS_CODE.OK
    data: DataTable
}