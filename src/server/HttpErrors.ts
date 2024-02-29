//
//
//
//
//
import { HTTP_STATUS_MESSAGE } from "../lib/Const"


export class HttpError extends Error {
    status: number

    constructor(status: number, message?: string) {
        super(message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
        this.name = "HttpError"
        this.status = status
    }
}

export class NotFoundError extends HttpError {
    constructor(message?: string) {
        super(404, message ?? "Resource not found")
        this.name = "NotFoundError"
    }
}

export class ServerError extends HttpError {
    constructor(message?: string) {
        super(500, message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
        this.name = "ServerError"
    }
}
export class BadRequestError extends HttpError {
    constructor(message?: string) {
        super(400, message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
        this.name = "BadRequestError"
    }
}
