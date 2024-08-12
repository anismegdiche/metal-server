/* eslint-disable max-classes-per-file */
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
        this.status = status ?? HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
    }

    SetName(name: string) {
        this.name = `${name.replace(/ /g, '')}Error`
    }
}

export class HttpBadRequestError extends HttpError {
    constructor(message?: string) {
        const _message = message ?? HTTP_STATUS_MESSAGE.BAD_REQUEST
        super(HTTP_STATUS_CODE.BAD_REQUEST, _message)
        this.SetName(_message)
    }
}

export class HttpNotFoundError extends HttpError {
    constructor(message?: string) {
        const _message = message ?? HTTP_STATUS_MESSAGE.NOT_FOUND
        super(HTTP_STATUS_CODE.NOT_FOUND, _message)
        this.SetName(_message)
    }
}

export class HttpContentTooLargeError extends HttpError {
    constructor(message?: string) {
        const _message = message ?? HTTP_STATUS_MESSAGE.CONTENT_TOO_LARGE
        super(HTTP_STATUS_CODE.CONTENT_TOO_LARGE, _message)
        this.SetName(_message)
    }
}

export class HttpInternalServerError extends HttpError {
    constructor(message?: string) {
        const _message = message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR
        super(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, _message)
        this.SetName(_message)
    }
}

export class HttpNotImplementedError extends HttpError {
    constructor(message?: string) {
        const _message = message ?? HTTP_STATUS_MESSAGE.NOT_IMPLEMENTED
        super(HTTP_STATUS_CODE.NOT_IMPLEMENTED, _message)
        this.SetName(_message)
    }
}

export class HttpMethodNotAllowedError extends HttpError {
    constructor(message?: string) {
        const _message = message ?? HTTP_STATUS_MESSAGE.METHOD_NOT_ALLOWED
        super(HTTP_STATUS_CODE.METHOD_NOT_ALLOWED, _message)
        this.SetName(_message)
    }
}
