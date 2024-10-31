//
//
//
//
//
import { Request, Response } from 'express'
import { Readable } from 'node:stream'
import { ReadStream } from "fs"
import _ from "lodash"
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TJson } from '../types/TJson'
import { TSchemaResponse } from '../types/TSchemaResponse'
import { Logger } from "../utils/Logger"
import { TInternalResponse } from '../types/TInternalResponse'
import { Server } from '../server/Server'
import { TypeHelper } from './TypeHelper'
import { JsonHelper } from './JsonHelper'
import { HttpErrorInternalServerError } from '../server/HttpErrors'
import { Config } from "../server/Config"
import { HTTP_STATUS_CODE } from "./Const"


export class Convert {

    @Logger.LogFunction()
    static JsonToArray(obj: TJson) {
        return Object
            .entries(obj)
            .map(([k, v]) => ({ [k]: v }))
    }

    @Logger.LogFunction()
    static HumainSizeToBytes(size: string) {

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const bytes = require('bytes')
        return bytes(size)
    }

    // @Logger.LogFunction()
    static RequestToSchemaRequest(req: Request): TSchemaRequest {
        const { schema, entityName } = req.params

        // Merge body and query parameters into schemaRequest
        return <TSchemaRequest>{
            schema,
            entityName,
            ...req.body,
            ...req.query
        }
    }

    // @Logger.LogFunction()
    static InternalResponseToResponse(res: Response, intRes: TInternalResponse<any>): Response {
        return res
            .status(intRes.StatusCode)
            .json(intRes.Body)
            .end()
    }

    // @Logger.LogFunction()
    static SchemaResponseToResponse(schemaResponse: TSchemaResponse, res: Response): Response {
        const { schema, entityName, result, status } = schemaResponse

        let resJson: TJson = {
            schema,
            entityName,
            result,
            status
        }

        res.status(status)

        if (TypeHelper.IsSchemaResponseData(schemaResponse)) {
            resJson = {
                ...resJson,
                cache: schemaResponse.cache,
                metadata: schemaResponse.data.MetaData,
                fields: schemaResponse.data.Fields,
                rows: schemaResponse.data.Rows
            }
        }

        if (Config.Flags.EnableResponseChunk && schemaResponse.status === HTTP_STATUS_CODE.OK) {
            Convert.#SchemaResponseToResponseChunkPrepare(schemaResponse, res, resJson)
        } else {
            res.json(resJson)
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
                    this.push(
                        // eslint-disable-next-line you-dont-need-lodash-underscore/omit
                        JSON.stringify(_.omit(resJson, "rows"))
                            .replace(/}$/, ',')) // Remove closing brace to continue streaming rows

                    this.push('"rows":[')

                    this.push(JSON.stringify(schemaResponse.data.Rows.shift()))

                    while (schemaResponse.data.Rows.length > 0) {
                        this.push(`,${JSON.stringify(schemaResponse.data.Rows.shift())}`)
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


    static EvaluateJsCode(value: string): string
    static EvaluateJsCode(value: TJson | TJson[] | undefined): TJson[] | undefined
    static EvaluateJsCode(value: object | TJson): object | TJson
    static EvaluateJsCode(value: string | object | TJson | TJson[] | undefined): string | object | TJson | TJson[] | undefined {
        if (value == undefined)
            return undefined
        
        const rxJsCode = /\$\{\{([^}]+)\}\}/g
        
        if (typeof value === 'string') {
            return value.replace(rxJsCode, (match, code) => {
                try {
                    const __result = Server.Sandbox.Evaluate(code)
                    return (__result === undefined)
                        ? ''
                        : __result.toString()
                } catch (error) {
                    Logger.Error(`Error evaluating code: ${code}\r${JsonHelper.Stringify(error)}`)
                    // Return the original placeholder if there's an error
                    return `$\{{${code}}}`
                }
            })
        }

        const evalString = Convert.EvaluateJsCode(JsonHelper.Stringify(value))
        return JsonHelper.TryParse(evalString, {})
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