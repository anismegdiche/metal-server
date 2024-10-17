 
//
//
//
//
//
import { HTTP_STATUS_CODE } from "../lib/Const"
import { DataTable } from "./DataTable"


export type TSchemaResponse = {
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

//XXX export type TSchemaResponseError = {
//XXX     schemaName: string
//XXX     entityName: string
//XXX     result: string
//XXX     status: HTTP_STATUS_CODE.BAD_REQUEST | HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
//XXX     error: string
//XXX     cache?: string
//XXX     expires?: number
//XXX }

//XXX export type TSchemaResponse = TSchemaResponseData //XXX: | TSchemaResponseError //XXX | TSchemaResponseNoData 