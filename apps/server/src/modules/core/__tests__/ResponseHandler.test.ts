import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DataTable } from "../../../types/DataTable"
import { Schema } from "../../schema/Schema"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { ConfigManager } from "../ConfigManager"
import { ResponseHandler } from "../ResponseHandler"

vi.mock("../ConfigManager")
vi.mock("../../schema/Schema")
vi.mock("../errors/HttpErrors")

describe("ResponseHandler", () => {
	let mockRes: any

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(ConfigManager.Get).mockReturnValue(undefined)
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

		it("should stream valid JSON chunks when response-chunk is enabled", async () => {
			const { Writable } = await import("node:stream")

			const iterator = (async function* () {
				yield { id: 1, name: "a" }
				yield { id: 2, name: "b" }
			})()

			const schemaRes: TSchemaResponse = {
				schema: "s",
				entity: "e",
				status: 200,
				data: {
					Count: vi.fn().mockResolvedValue(2),
					MetaData: {},
					Fields: { id: "number", name: "string" },
					RowsIterator: vi.fn().mockResolvedValue(iterator),
					Rows: vi.fn().mockResolvedValue([
						{ id: 1, name: "a" },
						{ id: 2, name: "b" },
					]),
				} as unknown as DataTable,
			}
			vi.mocked(Schema.IsSchemaResponse).mockReturnValue(true)
			vi
				.mocked(ConfigManager.Get)
				.mockImplementation((key: string) => (key === "server.response-chunk" ? true : undefined))

			const chunks: Buffer[] = []
			let doneResolve!: () => void
			const done = new Promise<void>((resolve) => {
				doneResolve = resolve
			})

			const res = new Writable({
				write(chunk, _encoding, callback) {
					chunks.push(chunk as Buffer)
					callback()
				},
			}) as any
			res.status = vi.fn().mockReturnThis()
			res.json = vi.fn().mockReturnThis()
			res.on("finish", () => doneResolve())

			await ResponseHandler.FromSchemaResponse(schemaRes, res)
			await done

			const raw = Buffer.concat(chunks).toString()
			expect(JSON.parse(raw)).toEqual({
				schema: "s",
				entity: "e",
				status: 200,
				metadata: {},
				fields: { id: "number", name: "string" },
				rows: [
					{ id: 1, name: "a" },
					{ id: 2, name: "b" },
				],
			})
			expect(schemaRes.data.RowsIterator).toHaveBeenCalled()
		})
	})

	describe("Response", () => {
		it("should skip the size check and stream when response-chunk is enabled", async () => {
			const { Writable } = await import("node:stream")

			const iterator = (async function* () {
				yield { id: 1, name: "a" }
			})()

			const schemaRes: TSchemaResponse = {
				schema: "s",
				entity: "e",
				status: 200,
				data: {
					Count: vi.fn().mockResolvedValue(1),
					MetaData: {},
					Fields: { id: "number" },
					RowsIterator: vi.fn().mockResolvedValue(iterator),
					Rows: vi.fn(),
				} as unknown as DataTable,
			}
			vi.mocked(Schema.IsSchemaResponse).mockReturnValue(true)
			vi
				.mocked(ConfigManager.Get)
				.mockImplementation((key: string) => (key === "server.response-chunk" ? true : undefined))

			const chunks: Buffer[] = []
			let doneResolve!: () => void
			const done = new Promise<void>((resolve) => {
				doneResolve = resolve
			})

			const res = new Writable({
				write(chunk, _encoding, callback) {
					chunks.push(chunk as Buffer)
					callback()
				},
			}) as any
			res.status = vi.fn().mockReturnThis()
			res.json = vi.fn().mockReturnThis()
			res.on("finish", () => doneResolve())

			await ResponseHandler.Response(res, { StatusCode: 200, Body: schemaRes })
			await done

			expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual({
				schema: "s",
				entity: "e",
				status: 200,
				metadata: {},
				fields: { id: "number" },
				rows: [{ id: 1, name: "a" }],
			})
			expect(res.json).not.toHaveBeenCalled()
			expect(schemaRes.data.Rows).not.toHaveBeenCalled()
		})

		it("should throw HttpErrorContentTooLarge when response exceeds limit and chunking is disabled", async () => {
			const schemaRes: TSchemaResponse = {
				schema: "s",
				entity: "e",
				status: 200,
				data: { Count: vi.fn().mockResolvedValue(0) } as unknown as DataTable,
			}
			vi.mocked(Schema.IsSchemaResponse).mockReturnValue(true)
			vi
				.mocked(ConfigManager.Get)
				.mockImplementation((key: string) =>
					key === "server.response-chunk" ? false : key === "server.response-limit" ? "0" : undefined,
				)

			const { HttpErrorContentTooLarge } = await import("../../errors/HttpErrors")
			await expect(ResponseHandler.Response(mockRes, { StatusCode: 200, Body: schemaRes })).rejects.toBeInstanceOf(
				HttpErrorContentTooLarge,
			)
		})
	})
})
