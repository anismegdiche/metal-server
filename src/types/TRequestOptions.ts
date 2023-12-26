//
//
//
//
//
import { TJson} from "./TJson"

export type TRequestOptions  = {
    fields?: string
    filter?: TJson
    filterExpression?: string
    data?: any | TJson[]
    sort?: string
    cache?: string
}