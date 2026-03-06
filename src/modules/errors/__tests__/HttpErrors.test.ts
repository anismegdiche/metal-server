import { beforeEach, describe, expect, it, vi } from "vitest"
import { Logger } from "../../../utils/Logger"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import {
	HttpErrorBadRequest,
	HttpErrorContentTooLarge,
	HttpErrorForbidden,
	HttpErrorInternalServerError,
	HttpErrorLog,
	HttpErrorNotFound,
	HttpErrorNotImplemented,
	HttpErrorSwitch,
	HttpErrorTooManyRequests,
	HttpErrorUnauthorized,
} from "../HttpErrors"

describe("HttpErrors", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	describe("Classes", () => {
		it("HttpErrorBadRequest should have status 400", () => {
			const err = new HttpErrorBadRequest("test")
			expect(err.Status).toBe(HTTP_STATUS_CODE.BAD_REQUEST)
			expect(err.message).toBe("test")
		})

		it("HttpErrorNotFound should have status 404", () => {
			const err = new HttpErrorNotFound()
			expect(err.Status).toBe(HTTP_STATUS_CODE.NOT_FOUND)
		})

		it("should initialize other error classes", () => {
			expect(new HttpErrorUnauthorized().Status).toBe(HTTP_STATUS_CODE.UNAUTHORIZED)
			expect(new HttpErrorForbidden().Status).toBe(HTTP_STATUS_CODE.FORBIDDEN)
			expect(new HttpErrorTooManyRequests().Status).toBe(HTTP_STATUS_CODE.TOO_MANY_REQUESTS)
			expect(new HttpErrorContentTooLarge().Status).toBe(HTTP_STATUS_CODE.CONTENT_TOO_LARGE)
			expect(new HttpErrorNotImplemented().Status).toBe(HTTP_STATUS_CODE.NOT_IMPLEMENTED)
		})
	})

	describe("HttpErrorSwitch", () => {
		it("should return correct error class based on status", () => {
			expect(HttpErrorSwitch(400)).toBeInstanceOf(HttpErrorBadRequest)
			expect(HttpErrorSwitch(404)).toBeInstanceOf(HttpErrorNotFound)
			expect(HttpErrorSwitch(500)).toBeInstanceOf(HttpErrorInternalServerError)
			expect(HttpErrorSwitch(999)).toBeInstanceOf(HttpErrorInternalServerError)
		})
	})

	describe("HttpErrorLog", () => {
		it("should log warning for 404", () => {
			const err = new HttpErrorNotFound("missing")
			HttpErrorLog(err)
			expect(Logger.Warn).toHaveBeenCalledWith("missing")
		})

		it("should log error for others", () => {
			const err = new HttpErrorInternalServerError("boom")
			HttpErrorLog(err)
			expect(Logger.Error).toHaveBeenCalledWith("boom")
		})

		it("should log stack in debug mode", () => {
			const err = new HttpErrorInternalServerError("boom")
			err.stack = "stacktrace"

			// Mock the Logger.Level to be 'debug'
			Logger.Level = "debug"

			HttpErrorLog(err)

			expect(Logger.Error).toHaveBeenCalledWith("stacktrace")
		})
	})
})
