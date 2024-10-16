 
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

export type TSchemaResponseNoData = {
    schemaName: string
    entityName: string
    result: string
    status: HTTP_STATUS_CODE.CREATED | HTTP_STATUS_CODE.NO_CONTENT | HTTP_STATUS_CODE.NOT_FOUND
}

export type TSchemaResponseError = {
    schemaName: string
    entityName: string
    result: string
    status: HTTP_STATUS_CODE.BAD_REQUEST | HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
    error: string
    cache?: string
    expires?: number
}

export type TSchemaResponse = TSchemaResponseData | TSchemaResponseNoData | TSchemaResponseError