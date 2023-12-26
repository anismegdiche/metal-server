//
//
//
//
//
import { TJson } from "./TJson"

export type TSchemaRequest = {
    // from Request
    schemaName: string
    entityName: string
    data?: TJson[]
    fields?: string
    filter?: TJson
    filterExpression?: string
    sort?: string
    cache?: string
    //
    sourceName?: string
}