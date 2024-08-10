//
//
//
//
//
import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from "../lib/Const"


export class HttpError extends Error {
    status: number

    constructor(status: number, message?: string) {
        super(message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
        this.name = "HttpError"
        this.status = status
    }

    SetName(name: string) {
        this.name = `${name.replace(/ /g, '')}Error`
    }
}

export class BadRequestError extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.BAD_REQUEST, message ?? HTTP_STATUS_MESSAGE.BAD_REQUEST)
        this.SetName(HTTP_STATUS_MESSAGE.BAD_REQUEST)
    }
}

export class NotFoundError extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.NOT_FOUND, message ?? HTTP_STATUS_MESSAGE.NOT_FOUND)
        this.SetName(HTTP_STATUS_MESSAGE.NOT_FOUND)
    }
}

export class ContentTooLargeError extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.CONTENT_TOO_LARGE, message ?? HTTP_STATUS_MESSAGE.CONTENT_TOO_LARGE)
        this.SetName(HTTP_STATUS_MESSAGE.CONTENT_TOO_LARGE)
    }
}

export class ServerError extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
        this.SetName(HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
    }
}
