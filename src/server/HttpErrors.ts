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

export class BadRequestError extends HttpError {
    constructor(message?: string) {
        super(400, message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
        this.name = "BadRequestError"
    }
}

export class NotFoundError extends HttpError {
    constructor(message?: string) {
        super(404, message ?? HTTP_STATUS_MESSAGE.NOT_FOUND)
        this.name = "NotFoundError"
    }
}

export class ContentTooLarge extends HttpError {
    constructor(message?: string) {
        super(413, message ?? HTTP_STATUS_MESSAGE.CONTENT_TOO_LARGE)
        this.name = "ContentTooLarge"
    }
}

export class ServerError extends HttpError {
    constructor(message?: string) {
        super(500, message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
        this.name = "ServerError"
    }
}
