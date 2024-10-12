 
//
//
//
//
//
import { HTTP_STATUS_CODE } from "../lib/Const"
import { DataTable } from "./DataTable"

 
export enum TRANSACTION {
    SELECT = "select",
    UPDATE = "update",
    INSERT = "insert",
    DELETE = "delete",
    PLAN = "plan",
    CACHE_DATA = "cache data",
    CACHE_PURGE = "cache purge",
    CACHE_CLEAN = "cache clean"
}

type TTransactionData = TRANSACTION.SELECT
    | TRANSACTION.PLAN
    | TRANSACTION.CACHE_DATA

type TTransactionNoData = TRANSACTION.DELETE | TRANSACTION.INSERT | TRANSACTION.SELECT | TRANSACTION.UPDATE
    | TRANSACTION.PLAN
    | TRANSACTION.CACHE_CLEAN | TRANSACTION.CACHE_DATA | TRANSACTION.CACHE_PURGE

type TTransactionError = TTransactionNoData

export type TSchemaResponseData = {
    schemaName: string
    entityName: string
    transaction: TTransactionData
    result: string
    status: HTTP_STATUS_CODE.OK
    cache?: string
    expires?: number
    data: DataTable
}

export type TSchemaResponseNoData = {
    schemaName: string
    entityName: string
    transaction: TTransactionNoData
    result: string
    status: HTTP_STATUS_CODE.CREATED | HTTP_STATUS_CODE.NO_CONTENT | HTTP_STATUS_CODE.NOT_FOUND
}

export type TSchemaResponseError = {
    schemaName: string
    entityName: string
    transaction: TTransactionError
    result: string
    status: HTTP_STATUS_CODE.BAD_REQUEST | HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
    error: string
    cache?: string
    expires?: number
}

export type TSchemaResponse = TSchemaResponseData | TSchemaResponseNoData | TSchemaResponseError