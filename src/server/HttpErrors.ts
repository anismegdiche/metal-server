/* eslint-disable max-classes-per-file */
//
//
//
//
//
import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from "../lib/Const"


export class HttpError extends Error {
    Status: number
    Name: string

    constructor(status: number, message?: string) {
        super(message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
        this.Status = status ?? HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
        this.name = "HttpError"
        this.Name = HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR
    }
}

export class HttpErrorBadRequest extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.BAD_REQUEST, message ?? HTTP_STATUS_MESSAGE.BAD_REQUEST)
        this.name = "HttpErrorBadRequest"
        this.Name = HTTP_STATUS_MESSAGE.BAD_REQUEST
    }
}

export class HttpErrorNotFound extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.NOT_FOUND, message ?? HTTP_STATUS_MESSAGE.NOT_FOUND)
        this.name = "HttpErrorNotFound"
        this.Name = HTTP_STATUS_MESSAGE.NOT_FOUND
    }
}

export class HttpErrorContentTooLarge extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.CONTENT_TOO_LARGE, message ?? HTTP_STATUS_MESSAGE.CONTENT_TOO_LARGE)
        this.name = "HttpErrorContentTooLarge"
        this.Name = HTTP_STATUS_MESSAGE.CONTENT_TOO_LARGE
    }
}

export class HttpErrorInternalServerError extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, message ?? HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR)
        this.name = "HttpErrorInternalServerError"
        this.Name = HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR
    }
}

export class HttpErrorNotImplemented extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.NOT_IMPLEMENTED, message ?? HTTP_STATUS_MESSAGE.NOT_IMPLEMENTED)
        this.name = "HttpErrorNotImplemented"
        this.Name = HTTP_STATUS_MESSAGE.NOT_IMPLEMENTED
    }
}

export class HttpErrorMethodNotAllowed extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.METHOD_NOT_ALLOWED, message ?? HTTP_STATUS_MESSAGE.METHOD_NOT_ALLOWED)
        this.name = "HttpErrorMethodNotAllowed"
        this.Name = HTTP_STATUS_MESSAGE.METHOD_NOT_ALLOWED
    }
}

export class HttpErrorUnauthorized extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.UNAUTHORIZED, message ?? HTTP_STATUS_MESSAGE.UNAUTHORIZED)
        this.name = "HttpErrorUnauthorized"
        this.Name = HTTP_STATUS_MESSAGE.UNAUTHORIZED
    }
}

export class HttpErrorForbidden extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.FORBIDDEN, message ?? HTTP_STATUS_MESSAGE.FORBIDDEN)
        this.name = "HttpErrorForbidden"
        this.Name = HTTP_STATUS_MESSAGE.FORBIDDEN
    }
}
