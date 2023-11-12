//
//
//
//
//
import { HTTP_STATUS_CODE } from "../lib/Const"
import { DataTable } from "./DataTable"


export enum TTransaction {
    select = "select",
    update = "update",
    insert = "insert",
    delete = "delete",
    plan = "plan",
    cache_data = "cache data",
    cache_purge = "cache purge",
    cache_clean = "cache clean"
}

type TTransactionData = TTransaction.select
    | TTransaction.plan
    | TTransaction.cache_data

type TTransactionNoData = TTransaction.delete | TTransaction.insert | TTransaction.select | TTransaction.update
    | TTransaction.plan
    | TTransaction.cache_clean | TTransaction.cache_data | TTransaction.cache_purge

type TTransactionError = TTransactionNoData

export type TDataResponseData = {
    schema: string
    entity: string
    transaction: TTransactionData
    result: string
    status: HTTP_STATUS_CODE.OK
    cache?: string
    expires?: number
    data: DataTable
}

export type TDataResponseNoData = {
    schema: string
    entity: string
    transaction: TTransactionNoData
    result: string
    status: HTTP_STATUS_CODE.CREATED | HTTP_STATUS_CODE.NOT_FOUND
}

export type TDataResponseError = {
    schema: string
    entity: string
    transaction: TTransactionError
    result: string
    status: HTTP_STATUS_CODE.BAD_REQUEST | HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
    error: string
    cache?: string
    expires?: number
}

export type TDataResponse = TDataResponseData | TDataResponseNoData | TDataResponseError