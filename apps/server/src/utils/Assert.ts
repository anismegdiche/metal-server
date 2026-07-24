import { Logger } from "@metal/logger"
//
//
//
import type z from "zod"
import { HttpError, HttpErrorInternalServerError } from "../modules/errors/HttpErrors"

//
export class Assert {
	static ZodSchema<T>(value: unknown, zodSchema: z.ZodSchema<T>, message: string): T {
		try {
			return zodSchema.parse(value)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			throw new HttpErrorInternalServerError(`${message}: ${errorMessage}`)
		}
	}

	static Condition(
		condition: boolean,
		message: string,
		httpError: HttpError = new HttpErrorInternalServerError(),
	): void {
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
	static Var<T>(
		variable: unknown,
		guard: (v: unknown) => v is T,
		message: string,
		httpError?: HttpError,
	): asserts variable is T
	static Var<T>(
		variable: unknown,
		conditionOrMessageOrGuard: boolean | string | ((v: unknown) => v is T),
		messageOrHttpError?: string | HttpError,
		httpError?: HttpError,
	): asserts variable is T {
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

	// Overload: check undefined
	static Get<T>(variable: unknown, message: string, httpError?: HttpError): T
	// Overload: check condition manually
	static Get<T>(variable: unknown, condition: boolean, message: string, httpError?: HttpError): T
	// Overload: check with runtime type guard
	static Get<T>(variable: unknown, guard: (v: unknown) => v is T, message: string, httpError?: HttpError): T
	static Get<T>(
		variable: unknown,
		conditionOrMessageOrGuard: boolean | string | ((v: unknown) => v is T),
		messageOrHttpError?: string | HttpError,
		httpError?: HttpError,
	): T {
		if (typeof conditionOrMessageOrGuard === "string") {
			Assert.Var(variable, conditionOrMessageOrGuard, httpError)
			return variable as T
		}
		if (typeof conditionOrMessageOrGuard === "function") {
			Assert.Var(variable, conditionOrMessageOrGuard, messageOrHttpError as string, httpError)
			return variable as T
		}
		Assert.Var(variable, conditionOrMessageOrGuard as boolean, messageOrHttpError as string, httpError)
		return variable as T
	}
}
