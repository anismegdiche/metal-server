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
    entity: string

    // from Request Options
    data?: TJson | TJson[]
    fields?: string
    filter?: TJson
    "filter-expression"?: string
    sort?: string
    cache?: number

    //
    source?: string
}

export type TSchemaRequestSelect = Pick<TSchemaRequest,
    'schema' | 'entity' | 'source' | 'fields' | 'filter' | 'filter-expression' | 'sort' | 'cache' | 'anonymize'>

export type TSchemaRequestUpdate = Pick<TSchemaRequest,
    'schema' | 'entity' | 'source' | 'data' | 'filter' | 'filter-expression'>

export type TSchemaRequestDelete = Pick<TSchemaRequest,
    'schema' | 'entity' | 'source' | 'filter' | 'filter-expression'>

export type TSchemaRequestInsert = Pick<TSchemaRequest,
    'schema' | 'entity' | 'source' | 'data'>

export type TSchemaRequestListEntities = Pick<TSchemaRequest,
    'schema' | 'entity' | 'source'>
