//
//
//
//
//
import { TJson} from "./TJson"

export type TRequestOptions  = {
    fields?: string
    filter?: TJson
    "filter-expression"?: string
    data?: any | TJson[]
    sort?: string
    cache?: string
}