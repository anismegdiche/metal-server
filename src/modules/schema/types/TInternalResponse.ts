import { HTTP_STATUS_CODE } from '../../core/@consts'


export type TInternalResponse<T> = {
    StatusCode: HTTP_STATUS_CODE
    Body?: T
}