//
//
//
import { NextFunction, Request, Response } from 'express'
import _ from "lodash"
import { Readable } from 'node:stream'
import typia from "typia"
//
import { TJson } from '../../types/TJson'
import { TypeUtils } from '../../utils/TypeUtils'
import { HttpError, HttpErrorBadRequest, HttpErrorContentTooLarge, HttpErrorInternalServerError, HttpErrorLog, HttpErrorNotImplemented } from '../errors/HttpErrors'
import { TSchemaResponse } from '../schema/types/TSchemaResponse'
import { HTTP_STATUS_CODE } from "./@consts"
import { ConfigManager } from "./ConfigManager"
import { Convert } from '../../utils/Convert'
import { JsonUtils } from '../../utils/JsonUtils'
import { Logger } from '../../utils/Logger'
import { TInternalResponse } from '../schema/types/TInternalResponse'
import { TRow } from '../../types/DataTable'


export class ResponseHandler {

    static SetContentJson(req: Request, res: Response, next: NextFunction) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        next()
    }

    static async FromSchemaResponse(schemaResponse: TSchemaResponse, res: Response): Promise<Response> {
        const { schema, entity, status } = schemaResponse

        let commonJsonResponse: TJson = {
            schema,
            entity,
            status
        }

        res.status(status)

        if (TypeUtils.IsSchemaResponseWithData(schemaResponse)) {
            commonJsonResponse = {
                ...commonJsonResponse,
                metadata: schemaResponse.data.MetaData,
                fields: schemaResponse.data.Fields,
                rows: await schemaResponse.data.Rows()
            }
        }

        if (ConfigManager.Get<boolean>('server.response-chunk') && schemaResponse.status === HTTP_STATUS_CODE.OK) {
            ResponseHandler.#ChunkPrepare(schemaResponse, res, commonJsonResponse)
        } else {
            res.json(commonJsonResponse)
        }

        return res
    }

    static async #ChunkPrepare(schemaResponse: TSchemaResponse, res: Response, resJson: TJson): Promise<void> {
        // Create a readable stream for the response
        const readable = new Readable({
            objectMode: true,
            async read() {
                if (TypeUtils.IsSchemaResponseWithData(schemaResponse)) {
                    // Push the initial part of the JSON response
                    this.push(
                        JsonUtils.Stringify(_.omit(resJson, "rows"))
                            .replace(/}$/, ',')) // Remove closing brace to continue streaming rows
                    this.push('"rows":[')
                    const iterator: AsyncIterableIterator<TRow> = await schemaResponse.data.RowsIterator({ batchSize: 1000 })
                    let row = await iterator.next()
                    this.push(JsonUtils.Stringify(row.value))
                    while (!row.done) {
                        row = await iterator.next()
                        this.push(`,${JsonUtils.Stringify(row.value)}`)
                    }
                    this.push(']') // End of array
                    this.push('}') // End of json
                } else {
                    this.push(JSON.stringify(resJson))
                }
                this.push(null) // End of stream
            }
        })

        // Pipe the readable stream to the response
        readable.pipe(res)

        readable.on('error', (error) => {
            throw new HttpErrorInternalServerError(`Stream error: ${error}`)
        })

        res.on('error', (error) => {
            throw new HttpErrorInternalServerError(`Response stream error: ${error}`)
        })
    }

    static async Response(res: Response, intRes: TInternalResponse<TSchemaResponse | undefined>): Promise<Response> {
        if (!intRes.Body) {
            throw new HttpErrorInternalServerError()
        }

        const _schemaResponse = intRes.Body
        const _resSize = JsonUtils.Size(_schemaResponse)

        Logger.Debug(`${Logger.Out} SchemaResponse.Select: response size = ${_resSize} bytes`)

        if (_resSize > Convert.HumainSizeToBytes(ConfigManager.Get('server.response-limit'))) {
            throw new HttpErrorContentTooLarge('Response body too large')
        }

        return ResponseHandler.FromSchemaResponse(_schemaResponse, res)
    }

    static ResponseError(res: Response, error: HttpError | Error) {
        const status = typia.is<HttpError>(error)
            ? error.Status
            : HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR

        HttpErrorLog(error)
        res
            .status(status)
            .json({
                error: error.message,
                stack: (status == HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR)
                    ? (error?.stack?.split('\n') ?? '')
                    : undefined
            })
            .end()
    }

    static ResponseNotImplemented(req: Request, res: Response): void {
        ResponseHandler.ResponseError(res, new HttpErrorNotImplemented())
    }

    static ResponseBadRequest(res: Response): void {
        ResponseHandler.ResponseError(res, new HttpErrorBadRequest())
    }
}
