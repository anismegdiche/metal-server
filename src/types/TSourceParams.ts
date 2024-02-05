import PROVIDER from '../server/Source'
import { TJson } from './TJson'

export type TSourceParams = {
    provider: PROVIDER
    host?: string
    port?: number
    user?: string
    password?: string
    database?: string
    options?: TJson
}