//
//
//
import type { TJson } from "../../types/TJson"
import { Stringify } from "../../utils/JsonUtils/Stringify"
import { Logger, VERBOSITY } from "../../utils/Logger"
import { HTTP_STATUS_CODE, HTTP_STATUS_MESSAGE } from "../core/@consts"

//
import {
	ConfigFileError,
	HttpError,
	HttpErrorBadRequest,
	HttpErrorContentTooLarge,
	HttpErrorForbidden,
	HttpErrorInternalServerError,
	HttpErrorMethodNotAllowed,
	HttpErrorNotFound,
	HttpErrorNotImplemented,
	HttpErrorTooManyRequests,
	HttpErrorUnauthorized,
	NormalizeError,
} from "./HttpErrorBase"

export {
	ConfigFileError,
	HttpError,
	HttpErrorBadRequest,
	HttpErrorContentTooLarge,
	HttpErrorForbidden,
	HttpErrorInternalServerError,
	HttpErrorMethodNotAllowed,
	HttpErrorNotFound,
	HttpErrorNotImplemented,
	HttpErrorTooManyRequests,
	HttpErrorUnauthorized,
	NormalizeError,
}

export function HttpErrorLog(error: HttpError | Error | unknown): void {
	const logger = error instanceof HttpErrorNotFound ? Logger.Warn : Logger.Error

	const _err = NormalizeError(error)

	logger(_err.message)

	if (Logger.Level === VERBOSITY.DEBUG) logger(_err.stack)
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
			default:
				return new HttpErrorInternalServerError(message)
		}
	} catch (error) {
		return new HttpErrorInternalServerError(Stringify(error))
	}
}
