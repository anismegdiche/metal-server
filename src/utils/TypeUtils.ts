//
//
//
//

import { prettifyError, type ZodSafeParseResult } from "zod"
import { HttpError, HttpErrorInternalServerError } from "../modules/errors/HttpErrorBase"
import { Logger } from "./Logger"
export class TypeUtils {
	static Validate<T>(result: ZodSafeParseResult<T>, httpError: HttpError = new HttpErrorInternalServerError()) {
		if (result.success) return

		const prettyErrors = prettifyError(result.error)
		Logger.Error(`${httpError.Name}:\r\n\r\n${prettyErrors}\r\n`)
		httpError.message = prettyErrors
		httpError.Name = "Bad Parameters"
		delete httpError.stack
		throw httpError
	}

	static GetType(v: unknown): string {
		if (v === null) return "null"

		const t = typeof v
		if (t !== "object") return t

		if (Array.isArray(v)) return "array"

		if (v instanceof Date) return "date"

		const ctor = (v as { constructor?: new (...args: unknown[]) => unknown })?.constructor
		if (ctor && ctor !== Object && ctor.name) return ctor.name

		return "object"
	}
}
