//
//
//
//
//
import { HTTP_STATUS_CODE } from "../lib/Const"
import { TInternalResponse } from "../types/TInternalResponse"

export class HttpResponse {
    static Ok<T>(data: T): TInternalResponse<T> {
        return <TInternalResponse<T>>{
            StatusCode: HTTP_STATUS_CODE.OK,
            Body: data
        } 
    }

    static Created(): TInternalResponse<undefined> {
        return {
            StatusCode: HTTP_STATUS_CODE.CREATED
        }
    }

    static NoContent(): TInternalResponse<undefined> {
        return {
            StatusCode: HTTP_STATUS_CODE.NO_CONTENT
        }
    }
}
