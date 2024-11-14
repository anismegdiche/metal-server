import { HTTP_STATUS_CODE } from '../lib/Const'


export type TInternalResponse<T> = {
    StatusCode: HTTP_STATUS_CODE
    Body?: T
}