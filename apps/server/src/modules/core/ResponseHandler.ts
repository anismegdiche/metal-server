//
//
//

import { Readable } from "node:stream"
import type { NextFunction, Request, Response } from "express"

//

import { Logger } from "@metal/logger"
import type { TJson } from "@metal/types"
import { JsonUtils } from "@metal/utils"
import type { TRow } from "../../types/DataTable"
import { Convert } from "../../utils/Convert"
import {
	HttpError,
	HttpErrorBadRequest,
	HttpErrorContentTooLarge,
	HttpErrorInternalServerError,
	HttpErrorLog,
	HttpErrorNotImplemented,
} from "../errors/HttpErrors"
import { Schema } from "../schema/Schema"
import type { TSchemaResponse } from "../schema/types/TSchemaResponse"
import { HTTP_STATUS_CODE } from "./@consts"
import { ConfigManager } from "./ConfigManager"
import type { TInternalResponse } from "./types/TInternalResponse"

export class ResponseHandler {
	static SetContentJson(_req: Request, res: Response, next: NextFunction) {
		res.setHeader("Content-Type", "application/json; charset=utf-8")
		next()
	}

	static async FromSchemaResponse(schemaResponse: TSchemaResponse, res: Response): Promise<Response> {
		const { schema, entity, status } = schemaResponse

		let commonJsonResponse: TJson = {
			schema,
			entity,
			status,
		}

		res.status(status)

		const chunkEnabled = ConfigManager.Get<boolean>("server.response-chunk") && status === HTTP_STATUS_CODE.OK

		let hasData = false
		if (Schema.IsSchemaResponse(schemaResponse)) {
			hasData = (await schemaResponse.data.Count()) > 0
		}

		if (hasData) {
			commonJsonResponse = {
				...commonJsonResponse,
				metadata: schemaResponse.data.MetaData,
				fields: schemaResponse.data.Fields,
			}

			// Don't materialize all rows when streaming the response in chunks
			if (!chunkEnabled) {
				commonJsonResponse = {
					...commonJsonResponse,
					rows: await schemaResponse.data.Rows(),
				}
			}
		}

		if (chunkEnabled) {
			ResponseHandler.#ChunkPrepare(schemaResponse, res, commonJsonResponse, hasData)
		} else {
			res.json(commonJsonResponse)
		}

		return res
	}

	static #ChunkPrepare(schemaResponse: TSchemaResponse, res: Response, resJson: TJson, hasData: boolean): void {
		// Stream JSON chunks through a Readable that respects backpressure.
		// Readable.from() pauses the generator when the consumer (res) is slow,
		// so the whole result set is never buffered in memory at once.
		async function* generate(): AsyncGenerator<string> {
			if (hasData) {
				yield JsonUtils.Stringify(resJson).replace(/\}$/, ",") // Remove closing brace to continue streaming rows
				yield '"rows":['
				const iterator: AsyncIterableIterator<TRow> = await schemaResponse.data.RowsIterator({ batchSize: 1000 })
				let first = true
				for await (const row of iterator) {
					yield `${first ? "" : ","}${JsonUtils.Stringify(row)}`
					first = false
				}
				yield "]"
				yield "}"
			} else {
				yield JsonUtils.Stringify(resJson)
			}
		}

		const readable = Readable.from(generate())

		// Errors in the generator surface here (never throw inside event handlers)
		readable.on("error", (error) => {
			if (!res.headersSent) {
				res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({ error: error.message })
			} else {
				res.destroy(error)
			}
		})

		// Client disconnected mid-stream: stop the source stream
		res.on("error", () => {
			readable.destroy()
		})

		readable.pipe(res)
	}

	static async Response(res: Response, intRes: TInternalResponse<TSchemaResponse | undefined>): Promise<Response> {
		if (!intRes.Body) {
			throw new HttpErrorInternalServerError()
		}

		const _schemaResponse = intRes.Body

		// When chunking is enabled the payload is streamed row by row, so there
		// is no fully materialized body to measure. Running JsonUtils.Size here
		// would serialize the whole DataTable (rows included) and defeat the
		// purpose of streaming, so the response-limit check is only applied to
		// non-chunked responses.
		if (!ConfigManager.Get<boolean>("server.response-chunk")) {
			const _resSize = JsonUtils.Size(_schemaResponse)

			Logger.Debug(`${Logger.Out} SchemaResponse.Select: response size = ${_resSize} bytes`)

			if (_resSize > Convert.HumainSizeToBytes(ConfigManager.Get("server.response-limit"))) {
				throw new HttpErrorContentTooLarge("Response body too large")
			}
		}

		return ResponseHandler.FromSchemaResponse(_schemaResponse, res)
	}

	static ResponseError(res: Response, error: HttpError | Error) {
		const status = error instanceof HttpError ? error.Status : HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR

		HttpErrorLog(error)
		res
			.status(status)
			.json({
				error: error.message,
				stack: status === HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR ? (error?.stack?.split("\n") ?? "") : undefined,
			})
			.end()
	}

	static ResponseNotImplemented(_req: Request, res: Response): void {
		ResponseHandler.ResponseError(res, new HttpErrorNotImplemented())
	}

	static ResponseBadRequest(res: Response): void {
		ResponseHandler.ResponseError(res, new HttpErrorBadRequest())
	}
}
