import PROVIDER from '../server/Source'
import { TRequestOptions } from "./TRequestOptions"

export type TSourceParams = {
    provider: PROVIDER
    host?: string
    port?: number
    user?: string
    password?: string
    database?: string
    options?: TRequestOptions
}