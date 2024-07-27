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
    data?: TJson[]
    fields?: string
    filter?: TJson
    filterExpression?: string
    sort?: string
    cache?: number
    
    //
    sourceName?: string
}