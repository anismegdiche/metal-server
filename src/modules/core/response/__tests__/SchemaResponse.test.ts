import type { Request, Response } from "express"
import type { Mock } from "vitest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HttpErrorInternalServerError } from "../../../errors/HttpErrors"
import { HTTP_STATUS_CODE } from "../../@consts"
import { SchemaResponse } from "../SchemaResponse"

type Res = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }

vi.mock("../../RequestHandler", () => ({
	RequestHandler: {
		CheckRequest: vi.fn(),
	},
}))

vi.mock("../../ResponseHandler", () => ({
	ResponseHandler: {
		Response: vi.fn(),
		ResponseError: vi.fn(),
		FromSchemaResponse: vi.fn(),
	},
}))

vi.mock("../../../schema/Schema", () => ({
	Schema: {
		Select: vi.fn(),
		Delete: vi.fn(),
		Update: vi.fn(),
		Insert: vi.fn(),
		ListEntities: vi.fn(),
	},
}))

vi.mock("../../../../utils/Convert", () => ({
	Convert: {
		RequestToSchemaRequest: vi.fn(),
		InternalResponseToResponse: vi.fn(),
	},
}))

const { RequestHandler } = await import("../../RequestHandler")
const { ResponseHandler } = await import("../../ResponseHandler")
const { Schema } = await import("../../../schema/Schema")
const { Convert } = await import("../../../../utils/Convert")

const SchemaMock = vi.mocked(Schema)
const ResponseHandlerMock = vi.mocked(ResponseHandler)
const ConvertMock = vi.mocked(Convert)

const mockResolved = (fn: Mock, value: unknown) => {
	fn.mockResolvedValue(value)
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0))
const getResponseError = () => (ResponseHandlerMock.ResponseError as unknown as Mock).mock.calls.at(0)?.[1]

describe("SchemaResponse", () => {
	const res: Res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		end: vi.fn().mockReturnThis(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		ConvertMock.RequestToSchemaRequest = vi.fn().mockReturnValue({ schema: "s" })
	})

	it("should handle select and pass response to handler", async () => {
		mockResolved(SchemaMock.Select as unknown as Mock, { Body: { status: 200 } })

		SchemaResponse.Select({ __METAL_CURRENT_USER: {} } as unknown as Request, res as unknown as Response)
		await flushMicrotasks()

		expect(RequestHandler.CheckRequest).toHaveBeenCalled()
		expect(Schema.Select).toHaveBeenCalled()
		expect(ResponseHandlerMock.Response).toHaveBeenCalled()
	})

	it("should throw when delete status is not NO_CONTENT", async () => {
		mockResolved(SchemaMock.Delete as unknown as Mock, { StatusCode: HTTP_STATUS_CODE.OK })

		SchemaResponse.Delete({ __METAL_CURRENT_USER: {} } as unknown as Request, res as unknown as Response)
		await flushMicrotasks()

		const errorArg = getResponseError()
		expect(errorArg).toBeDefined()
		if (!errorArg) {
			throw new Error("Expected ResponseError to be called")
		}
		expect(errorArg).toBeInstanceOf(HttpErrorInternalServerError)
	})

	it("should insert and send response when status is CREATED", async () => {
		mockResolved(SchemaMock.Insert as unknown as Mock, { StatusCode: HTTP_STATUS_CODE.CREATED })

		SchemaResponse.Insert({ __METAL_CURRENT_USER: {} } as unknown as Request, res as unknown as Response)
		await flushMicrotasks()

		expect(ConvertMock.InternalResponseToResponse).toHaveBeenCalled()
	})

	it("should update and send response when status is NO_CONTENT", async () => {
		mockResolved(SchemaMock.Update as unknown as Mock, { StatusCode: HTTP_STATUS_CODE.NO_CONTENT })

		SchemaResponse.Update({ __METAL_CURRENT_USER: {} } as unknown as Request, res as unknown as Response)
		await flushMicrotasks()

		expect(ConvertMock.InternalResponseToResponse).toHaveBeenCalled()
	})

	it("should handle list entities when body is present", async () => {
		const schemaResponse = { schema: "s", entity: "e", status: 200 }
		mockResolved(SchemaMock.ListEntities as unknown as Mock, { Body: schemaResponse })

		SchemaResponse.ListEntities({ __METAL_CURRENT_USER: {} } as unknown as Request, res as unknown as Response)
		await flushMicrotasks()

		expect(ResponseHandlerMock.FromSchemaResponse).toHaveBeenCalledWith(schemaResponse, res)
	})

	it("should error when list entities body is missing", async () => {
		mockResolved(SchemaMock.ListEntities as unknown as Mock, { Body: undefined })

		SchemaResponse.ListEntities({ __METAL_CURRENT_USER: {} } as unknown as Request, res as unknown as Response)
		await flushMicrotasks()

		const errorArg = getResponseError()
		expect(errorArg).toBeDefined()
		if (!errorArg) {
			throw new Error("Expected ResponseError to be called")
		}
		expect(errorArg).toBeInstanceOf(HttpErrorInternalServerError)
	})
})
