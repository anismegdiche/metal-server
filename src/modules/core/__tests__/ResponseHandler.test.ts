

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DataTable } from "../../../types/DataTable"
import { Schema } from "../../schema/Schema"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { ResponseHandler } from "../ResponseHandler"

vi.mock("../ConfigManager")
vi.mock("../../schema/Schema")
vi.mock("../errors/HttpErrors")

describe("ResponseHandler", () => {
	let mockRes: any

	beforeEach(() => {
		vi.clearAllMocks()
		mockRes = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			setHeader: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
		}
	})

	describe("SetContentJson", () => {
		it("should set Content-Type header", () => {
			const next = vi.fn()
			ResponseHandler.SetContentJson({} as any, mockRes, next)
			expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "application/json; charset=utf-8")
			expect(next).toHaveBeenCalled()
		})
	})

	describe("ResponseError", () => {
		it("should return error with message", () => {
			const error = new Error("test-error")
			ResponseHandler.ResponseError(mockRes, error)
			expect(mockRes.status).toHaveBeenCalledWith(500)
			expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: "test-error" }))
		})
	})

	describe("FromSchemaResponse", () => {
		it("should return basic json if no data", async () => {
			const schemaRes: TSchemaResponse = {
				schema: "s",
				entity: "e",
				status: 200,
				data: { Count: vi.fn().mockResolvedValue(0) } as unknown as DataTable,
			}
			vi.mocked(Schema.IsSchemaResponse).mockReturnValue(true)

			await ResponseHandler.FromSchemaResponse(schemaRes, mockRes)

			expect(mockRes.status).toHaveBeenCalledWith(200)
			expect(mockRes.json).toHaveBeenCalledWith({ schema: "s", entity: "e", status: 200 })
		})
	})
})
