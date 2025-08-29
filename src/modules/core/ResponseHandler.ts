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


export class ResponseHandler {    

    static SetContentJson(req: Request, res: Response, next: NextFunction) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        next()
    }

    static FromSchemaResponse(schemaResponse: TSchemaResponse, res: Response): Response {
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
                rows: schemaResponse.data.Rows
            }
        }

        if (ConfigManager.Get<boolean>('server.response-chunk') && schemaResponse.status === HTTP_STATUS_CODE.OK) {
            ResponseHandler.#ChunkPrepare(schemaResponse, res, commonJsonResponse)
        } else {
            res.json(commonJsonResponse)
        }

        return res
    }

    static #ChunkPrepare(schemaResponse: TSchemaResponse, res: Response, resJson: TJson) {
        // Create a readable stream for the response
        const readable = new Readable({
            objectMode: true,
            read() {
                if (TypeUtils.IsSchemaResponseWithData(schemaResponse)) {
                    // Push the initial part of the JSON response
                    // deepcode ignore ArrayMethodOnNonArray: This usage is correct and unrelated to arrays
                    this.push(

                        JSON.stringify(_.omit(resJson, "rows"))
                            .replace(/}$/, ',')) // Remove closing brace to continue streaming rows

                    // deepcode ignore ArrayMethodOnNonArray: This usage is correct and unrelated to arrays
                    this.push('"rows":[')

                    // deepcode ignore ArrayMethodOnNonArray: This usage is correct and unrelated to arrays
                    this.push(JSON.stringify(schemaResponse.data.Rows.shift()))

                    while (schemaResponse.data.Rows.length > 0) {
                        // deepcode ignore ArrayMethodOnNonArray: This usage is correct and unrelated to arrays
                        this.push(`,${JSON.stringify(schemaResponse.data.Rows.shift())}`)
                    }
                    // deepcode ignore ArrayMethodOnNonArray: This usage is correct and unrelated to arrays
                    this.push(']') // End of array
                    // deepcode ignore ArrayMethodOnNonArray: This usage is correct and unrelated to arrays
                    this.push('}') // End of json
                } else {
                    // deepcode ignore ArrayMethodOnNonArray: This usage is correct and unrelated to arrays
                    this.push(JSON.stringify(resJson))
                }
                // deepcode ignore ArrayMethodOnNonArray: This usage is correct and unrelated to arrays
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

    static Response(res: Response, intRes: TInternalResponse<TSchemaResponse | undefined>): Response {
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
