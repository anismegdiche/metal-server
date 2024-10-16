 
//
//
//
//
//
import { HTTP_STATUS_CODE } from "../lib/Const"
import { DataTable } from "./DataTable"


export type TSchemaResponseData = {
    schemaName: string
    entityName: string
    result: string
    status: HTTP_STATUS_CODE.OK
    cache?: string
    expires?: number
    data: DataTable
}

//XXX export type TSchemaResponseNoData = {
//XXX     schemaName: string
//XXX     entityName: string
//XXX     result: string
//XXX     status: HTTP_STATUS_CODE.CREATED | HTTP_STATUS_CODE.NO_CONTENT | HTTP_STATUS_CODE.NOT_FOUND
//XXX }

export type TSchemaResponseError = {
    schemaName: string
    entityName: string
    result: string
    status: HTTP_STATUS_CODE.BAD_REQUEST | HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
    error: string
    cache?: string
    expires?: number
}

export type TSchemaResponse = TSchemaResponseData | TSchemaResponseError //XXX | TSchemaResponseNoData 