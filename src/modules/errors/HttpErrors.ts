
//
//
//
import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from "../core/@consts"
import { Stringify } from "../../utils/JsonUtils/Stringify"
import { Logger, VERBOSITY } from "../../utils/Logger"


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

export class HttpErrorTooManyRequests extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.TOO_MANY_REQUESTS, message ?? HTTP_STATUS_MESSAGE.TOO_MANY_REQUESTS)
        this.name = "HttpErrorTooManyRequests"
        this.Name = HTTP_STATUS_MESSAGE.TOO_MANY_REQUESTS
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

export class ConfigFileError extends HttpError {
    constructor(message?: string) {
        super(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, message ?? "Config File Error")
        this.name = "ConfigFileError"
        this.Name = "Config File Error"
    }
}


export function HttpErrorLog(error: HttpError | Error): void {
    const logger = (error instanceof HttpErrorNotFound)
        ? Logger.Warn
        : Logger.Error

    logger(error.message)
    if (Logger.Level === VERBOSITY.DEBUG)
        logger(error.stack)
}

export function HttpErrorSwitch(status?: number, message?: string): HttpError {
    try {
        switch (status) {
            case HTTP_STATUS_CODE.BAD_REQUEST:
                return new HttpErrorBadRequest(message)
            case HTTP_STATUS_CODE.NOT_FOUND:
                return new HttpErrorNotFound(message)
            case HTTP_STATUS_CODE.TOO_MANY_REQUESTS:
                return new HttpErrorTooManyRequests(message)
            case HTTP_STATUS_CODE.CONTENT_TOO_LARGE:
                return new HttpErrorContentTooLarge(message)
            case HTTP_STATUS_CODE.NOT_IMPLEMENTED:
                return new HttpErrorNotImplemented(message)
            case HTTP_STATUS_CODE.METHOD_NOT_ALLOWED:
                return new HttpErrorMethodNotAllowed(message)
            case HTTP_STATUS_CODE.UNAUTHORIZED:
                return new HttpErrorUnauthorized(message)
            case HTTP_STATUS_CODE.FORBIDDEN:
                return new HttpErrorForbidden(message)
            case HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR:
            default:
                return new HttpErrorInternalServerError(message)
        }
    } catch (error) {
        return new HttpErrorInternalServerError(Stringify(error))
    }
}