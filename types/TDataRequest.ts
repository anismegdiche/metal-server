//
//
//
//
//
import { TJson } from "./TJson"

export type TDataRequest = {
    // from Request
    schema: string
    entity: string
    data?: TJson[]
    fields?: string
    filter?: TJson
    "filter-expression"?: string
    sort?: string
    cache?: string
    //
    source?: string
}