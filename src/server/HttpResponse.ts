import { HTTP_STATUS_CODE } from "../lib/Const"
import { TInternalResponse } from "../types/TInternalResponse"

export class HttpResponse {
    static Ok<T>(data: T): TInternalResponse {
        return <TInternalResponse>{
            StatusCode: HTTP_STATUS_CODE.OK,
            Body: data
        } 
    }

    static Created<T>(data: T): TInternalResponse {
        return {
            StatusCode: HTTP_STATUS_CODE.CREATED
        }
    }

    static NoContent(): TInternalResponse {
        return {
            StatusCode: HTTP_STATUS_CODE.NO_CONTENT
        }
    }

    // You can add more methods for other status codes.
}
