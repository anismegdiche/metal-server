//
//
//
//
//
import { TJson } from "./TJson"

export type TSchemaRequest = {
    // from Config
    anonymize?: string | string[]

    // from Config or Request
    schemaName: string
    entityName: string

    // from Request Options
    data?: TJson | TJson[]
    fields?: string
    filter?: TJson
    "filter-expression"?: string
    sort?: string
    cache?: number

    //
    sourceName?: string
}

export type TSchemaRequestSelect = Pick<TSchemaRequest,
    'schemaName' | 'entityName' | 'sourceName' | 'fields' | 'filter' | 'filter-expression' | 'sort' | 'cache' | 'anonymize'>

export type TSchemaRequestUpdate = Pick<TSchemaRequest,
    'schemaName' | 'entityName' | 'sourceName' | 'data' | 'filter' | 'filter-expression'>

export type TSchemaRequestDelete = Pick<TSchemaRequest,
    'schemaName' | 'entityName' | 'sourceName' | 'filter' | 'filter-expression'>

export type TSchemaRequestInsert = Pick<TSchemaRequest,
    'schemaName' | 'entityName' | 'sourceName' | 'data'>

export type TSchemaRequestListEntities = Pick<TSchemaRequest,
    'schemaName' | 'entityName' | 'sourceName'>
