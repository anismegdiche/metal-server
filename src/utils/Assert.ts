//
//
//
import { HttpError, HttpErrorInternalServerError } from "../modules/errors/HttpErrors"
import { Logger } from "./Logger"


//
export class Assert {
    static Condition(condition: boolean, message: string, httpError: HttpError = new HttpErrorInternalServerError()): void {
        if (!condition) {
            httpError.message = `${Logger.Out} ${message}`
            throw httpError
        }
    }

    // Overload: check undefined
    static Var<T>(variable: unknown, message: string, httpError?: HttpError): asserts variable is T
    // Overload: check condition manually
    static Var<T>(variable: unknown, condition: boolean, message: string, httpError?: HttpError): asserts variable is T
    // Overload: check with runtime type guard
    static Var<T>(variable: unknown, guard: (v: unknown) => v is T, message: string, httpError?: HttpError): asserts variable is T
    static Var<T>(variable: unknown, conditionOrMessageOrGuard: boolean | string | ((v: unknown) => v is T), messageOrHttpError?: string | HttpError, httpError?: HttpError): asserts variable is T {

        let _httpError = httpError ?? new HttpErrorInternalServerError()
        if (messageOrHttpError instanceof HttpError) {
            _httpError = messageOrHttpError
        }

        // Case 1: Var(variable, message)
        if (typeof conditionOrMessageOrGuard === "string") {
            if (variable === undefined) {
                _httpError.message = `${Logger.Out} ${conditionOrMessageOrGuard}`
                throw _httpError
            }
            return
        }

        // Case 2: Var(variable, guard, message)
        if (typeof conditionOrMessageOrGuard === "function") {
            if (!conditionOrMessageOrGuard(variable)) {
                _httpError.message = `${Logger.Out} ${messageOrHttpError as string}`
                throw _httpError
            }
            return
        }

        // Case 3: Var(variable, condition, message)
        if (!conditionOrMessageOrGuard) {
            _httpError.message = `${Logger.Out} ${messageOrHttpError as string}`
            throw _httpError
        }
    }
}


