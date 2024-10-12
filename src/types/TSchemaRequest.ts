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
    filterExpression?: string
    sort?: string
    cache?: number

    //
    sourceName?: string
}

export type TSchemaRequestSelect = Pick<TSchemaRequest,
    'schemaName' | 'entityName' | 'sourceName' | 'fields' | 'filter' | 'filterExpression' | 'sort' | 'cache' | 'anonymize'>

export type TSchemaRequestUpdate = Pick<TSchemaRequest,
    'schemaName' | 'entityName' | 'sourceName' | 'data' | 'filter' | 'filterExpression'>

export type TSchemaRequestDelete = Pick<TSchemaRequest,
    'schemaName' | 'entityName' | 'sourceName' | 'filter' | 'filterExpression'>

export type TSchemaRequestInsert = Pick<TSchemaRequest,
    'schemaName' | 'entityName' | 'sourceName' | 'data'>
