//
//
//
import { HttpError, HttpErrorInternalServerError } from "../modules/errors/HttpErrors"


//
export class Assert {
    static Condition(condition: boolean, message: string, httpError: HttpError = new HttpErrorInternalServerError()): void {
        if (!condition) {
            httpError.message = message
            throw httpError
        }
    }

    static Var<T>(variable: unknown, message: string, httpError?: HttpError): asserts variable is T
    static Var<T>(variable: unknown, condition: boolean, message: string, httpError?: HttpError): asserts variable is T
    static Var<T>(variable: unknown, conditionOrMessage: boolean | string, messageOrError?: string | HttpError, httpError: HttpError = new HttpErrorInternalServerError()): asserts variable is T {
        if (typeof conditionOrMessage === "string") {
            // Overload: Var(variable, message) - condition defaults to undefined check
            if (variable === undefined) {
                httpError.message = conditionOrMessage
                throw httpError
            }
        } else if (!conditionOrMessage) {
            // Overload: Var(variable, condition, message)
            httpError.message = messageOrError as string
            throw httpError
        }
    }
}

