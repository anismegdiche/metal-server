//
//
//
//
//
import _ from "lodash"
import { Request, Response } from 'express'
import { Readable } from 'node:stream'
import { ReadStream } from "node:fs"
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TJson } from '../types/TJson'
import { TSchemaResponse } from '../types/TSchemaResponse'
import { TInternalResponse } from '../types/TInternalResponse'
import { TypeHelper } from './TypeHelper'
import { HttpErrorInternalServerError } from '../server/HttpErrors'
import { Config } from "../server/Config"
import { HTTP_STATUS_CODE } from "./Const"


export class Convert {

    static JsonToArray(obj: TJson) {
        return Object
            .entries(obj)
            .map(([k, v]) => ({ [k]: v }))
    }

    static HumainSizeToBytes(size: string) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const bytes = require('bytes')
        return bytes(size)
    }

    static RequestToSchemaRequest(req: Request): TSchemaRequest {
        const { schema, entity } = req.params

        // Merge body and query parameters into schemaRequest
        return <TSchemaRequest>{
            schema,
            entity,
            ...req.body,
            ...req.query
        }
    }

    static InternalResponseToResponse(res: Response, intRes: TInternalResponse<any>): Response {
        return res
            .status(intRes.StatusCode)
            .json(intRes.Body)
            .end()
    }

    static SchemaResponseToResponse(schemaResponse: TSchemaResponse, res: Response): Response {
        const { schema, entity, status } = schemaResponse

        let commonJsonResponse: TJson = {
            schema,
            entity,
            status
        }

        res.status(status)

        if (TypeHelper.IsSchemaResponseData(schemaResponse)) {
            commonJsonResponse = {
                ...commonJsonResponse,
                metadata: schemaResponse.data.MetaData,
                fields: schemaResponse.data.Fields,
                rows: schemaResponse.data.Rows
            }
        }

        if (Config.Get<boolean>('server.response-chunk') && schemaResponse.status === HTTP_STATUS_CODE.OK) {
            Convert.#SchemaResponseToResponseChunkPrepare(schemaResponse, res, commonJsonResponse)
        } else {
            res.json(commonJsonResponse)
        }

        return res
    }

    static #SchemaResponseToResponseChunkPrepare(schemaResponse: TSchemaResponse, res: Response, resJson: TJson) {
        // Create a readable stream for the response
        const readable = new Readable({
            objectMode: true,
            read() {
                if (TypeHelper.IsSchemaResponseData(schemaResponse)) {
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

    static PatternToRegex(pattern: string): RegExp {
        // Escape special regex characters except for * and ?
        const escapedPattern = pattern.replace(/([.+?^${}()|[\]\\])/g, '\\$1')

        // Replace friendly wildcards with regex equivalents
        const rxPattern = escapedPattern
            .replace(/\*/g, '.*')   // Convert * to .*
            .replace(/\?/g, '.')    // Convert ? to .

        // Create and return the RegExp object
        return new RegExp(`^${rxPattern}$`) // Anchored to match the whole string
    }

    static ReadStreamToReadable(readStream: ReadStream): Readable {
        const readableStream = new Readable({
            read() {
                // No-op, because we're manually pushing data
            }
        })

        // Pipe data from ReadStream into Readable
        readStream.on('data', (chunk) => {
            readableStream.push(chunk)  // Push data into the new Readable stream
        })

        readStream.on('end', () => {
            readableStream.push(null)  // Signal the end of the stream
        })

        readStream.on('error', (err) => {
            readableStream.emit('error', err)  // Forward any errors
        })

        return readableStream
    }
}