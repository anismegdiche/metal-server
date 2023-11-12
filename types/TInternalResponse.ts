import { HTTP_STATUS_CODE } from '../lib/Const'
import { TJson } from './TJson'


export type TInternalResponse = {
    StatusCode: HTTP_STATUS_CODE
    Body?: TJson
}