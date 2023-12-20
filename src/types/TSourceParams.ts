import { TRequestOptions } from "./TRequestOptions"

export type TSourceParams = {
    provider: string
    host?: string
    port?: number
    user?: string
    password?: string
    database?: string
    options?: TRequestOptions
}