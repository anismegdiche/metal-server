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
    schema: string
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
    'schema' | 'entityName' | 'sourceName' | 'fields' | 'filter' | 'filter-expression' | 'sort' | 'cache' | 'anonymize'>

export type TSchemaRequestUpdate = Pick<TSchemaRequest,
    'schema' | 'entityName' | 'sourceName' | 'data' | 'filter' | 'filter-expression'>

export type TSchemaRequestDelete = Pick<TSchemaRequest,
    'schema' | 'entityName' | 'sourceName' | 'filter' | 'filter-expression'>

export type TSchemaRequestInsert = Pick<TSchemaRequest,
    'schema' | 'entityName' | 'sourceName' | 'data'>

export type TSchemaRequestListEntities = Pick<TSchemaRequest,
    'schema' | 'entityName' | 'sourceName'>
