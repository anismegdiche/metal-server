import DATA_PROVIDER from '../server/Source'
import { TJson } from './TJson'

export type TSourceParams = {
    provider: DATA_PROVIDER
    host?: string
    port?: number
    user?: string
    password?: string
    database?: string
    options?: TJson
}