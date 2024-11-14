import { TJson } from "./TJson"


export type TOptions  = {
    Fields?: TJson | string
    Filter?: any
    Sort?: TJson | string
    Data?: any
    Cache?: number
}