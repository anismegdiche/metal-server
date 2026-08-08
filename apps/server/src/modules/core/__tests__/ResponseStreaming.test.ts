import http from "node:http"
import type { AddressInfo } from "node:net"
import zlib from "node:zlib"
import express, { type Express } from "express"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { DataTable } from "../../../types/DataTable"
import { RequestCompression } from "../../../utils/RequestCompression"
import { Schema } from "../../schema/Schema"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { ConfigManager } from "../ConfigManager"
import { ResponseHandler } from "../ResponseHandler"

vi.mock("../ConfigManager")
vi.mock("../../schema/Schema")

const ROWS = Array.from({ length: 50 }, (_value, index) => ({ id: index, value: "z".repeat(200) }))

const EXPECTED = {
	schema: "s",
	entity: "e",
	status: 200,
	metadata: { count: ROWS.length },
	fields: { id: "number", value: "string" },
	rows: ROWS,
}

type TTestServer = {
	server: http.Server
	baseUrl: string
}

type TTestResponse = {
	status: number
	headers: http.IncomingHttpHeaders
	body: Buffer
}

async function StartServer(app: Express): Promise<TTestServer> {
	const server = http.createServer(app)
	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", resolve)
	})
	const address = server.address() as AddressInfo
	return { server, baseUrl: `http://127.0.0.1:${address.port}` }
}

function Get(baseUrl: string, path: string, headers: Record<string, string> = {}): Promise<TTestResponse> {
	return new Promise((resolve, reject) => {
		const request = http.get(`${baseUrl}${path}`, { headers }, (response) => {
			const chunks: Buffer[] = []
			response.on("data", (chunk) => chunks.push(chunk as Buffer))
			response.on("end", () => {
				resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) })
			})
		})
		request.on("error", reject)
	})
}

function Gunzip(body: Buffer): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		zlib.gunzip(body, (error, result) => (error ? reject(error) : resolve(result)))
	})
}

function CreateSchemaResponse(): TSchemaResponse {
	const iterator = (async function* () {
		for (const row of ROWS) yield row
	})()

	return {
		schema: "s",
		entity: "e",
		status: 200,
		data: {
			Count: vi.fn().mockResolvedValue(ROWS.length),
			MetaData: { count: ROWS.length },
			Fields: { id: "number", value: "string" },
			Rows: vi.fn().mockResolvedValue(ROWS),
			RowsIterator: vi.fn().mockResolvedValue(iterator),
		} as unknown as DataTable,
	}
}

function CreateApp(useCompression: boolean): Express {
	const app = express()
	if (useCompression) {
		RequestCompression.Use(app)
	}
	app.use(ResponseHandler.SetContentJson)
	app.get("/schema", (_req, res) => {
		void ResponseHandler.FromSchemaResponse(CreateSchemaResponse(), res)
	})
	return app
}

describe("ResponseHandler streaming over HTTP", () => {
	let testServer: TTestServer

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(Schema.IsSchemaResponse).mockReturnValue(true)
		vi.mocked(ConfigManager.Get).mockImplementation((key: string) => (key === "server.response-chunk" ? true : undefined))
	})

	afterEach(async () => {
		vi.clearAllMocks()
		if (testServer) {
			await new Promise<void>((resolve, reject) => {
				testServer.server.close((error) => (error ? reject(error) : resolve()))
			})
		}
	})

	it("should stream rows with Transfer-Encoding chunked when chunking is enabled", async () => {
		testServer = await StartServer(CreateApp(false))

		const response = await Get(testServer.baseUrl, "/schema")

		expect(response.status).toBe(200)
		expect(response.headers["transfer-encoding"]).toBe("chunked")
		expect(response.headers["content-length"]).toBeUndefined()
		expect(JSON.parse(response.body.toString())).toEqual(EXPECTED)
	})

	it("should stream and compress the response when chunking and compression are both enabled", async () => {
		testServer = await StartServer(CreateApp(true))

		const response = await Get(testServer.baseUrl, "/schema", { "Accept-Encoding": "gzip" })

		expect(response.status).toBe(200)
		expect(response.headers["transfer-encoding"]).toBe("chunked")
		expect(response.headers["content-encoding"]).toBe("gzip")
		expect(JSON.parse((await Gunzip(response.body)).toString())).toEqual(EXPECTED)
	})

	it("should send a single buffered JSON body when chunking is disabled", async () => {
		vi
			.mocked(ConfigManager.Get)
			.mockImplementation((key: string) => (key === "server.response-chunk" ? false : undefined))

		testServer = await StartServer(CreateApp(false))

		const response = await Get(testServer.baseUrl, "/schema")

		expect(response.status).toBe(200)
		expect(response.headers["content-length"]).toBeDefined()
		expect(response.headers["transfer-encoding"]).toBeUndefined()
		expect(JSON.parse(response.body.toString())).toEqual(EXPECTED)
	})
})
