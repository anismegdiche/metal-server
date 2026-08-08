import http from "node:http"
import type { AddressInfo } from "node:net"
import zlib from "node:zlib"
import express, { type Express } from "express"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { RequestCompression } from "../../../utils/RequestCompression"

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

describe("RequestCompression", () => {
	let testServer: TTestServer

	beforeEach(async () => {
		const app = express()
		RequestCompression.Use(app)

		app.get("/big", (_req, res) => {
			res.json({ data: "x".repeat(5000) })
		})
		app.get("/small", (_req, res) => {
			res.json({ ok: true })
		})
		app.get("/stream", (_req, res) => {
			res.writeHead(200, { "Content-Type": "application/json" })
			res.write('{"rows":[')
			for (let index = 0; index < 20; index++) {
				res.write(`${index === 0 ? "" : ","}${JSON.stringify({ id: index, value: "y".repeat(300) })}`)
			}
			res.end("]}")
		})

		testServer = await StartServer(app)
	})

	afterEach(async () => {
		await new Promise<void>((resolve, reject) => {
			testServer.server.close((error) => (error ? reject(error) : resolve()))
		})
	})

	it("should gzip responses larger than the threshold when the client accepts gzip", async () => {
		const response = await Get(testServer.baseUrl, "/big", { "Accept-Encoding": "gzip" })

		expect(response.status).toBe(200)
		expect(response.headers["content-encoding"]).toBe("gzip")
		expect(JSON.parse((await Gunzip(response.body)).toString())).toEqual({ data: "x".repeat(5000) })
	})

	it("should not compress responses below the threshold", async () => {
		const response = await Get(testServer.baseUrl, "/small", { "Accept-Encoding": "gzip" })

		expect(response.status).toBe(200)
		expect(response.headers["content-encoding"]).toBeUndefined()
		expect(JSON.parse(response.body.toString())).toEqual({ ok: true })
	})

	it("should not compress responses when the client does not send Accept-Encoding", async () => {
		const response = await Get(testServer.baseUrl, "/big")

		expect(response.status).toBe(200)
		expect(response.headers["content-encoding"]).toBeUndefined()
		expect(JSON.parse(response.body.toString())).toEqual({ data: "x".repeat(5000) })
	})

	it("should compress streamed responses end-to-end", async () => {
		const response = await Get(testServer.baseUrl, "/stream", { "Accept-Encoding": "gzip" })

		expect(response.status).toBe(200)
		expect(response.headers["content-encoding"]).toBe("gzip")
		expect(response.headers["transfer-encoding"]).toBe("chunked")
		expect(JSON.parse((await Gunzip(response.body)).toString()).rows).toHaveLength(20)
	})
})
