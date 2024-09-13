//
//
//
//
//
import { Request, Response } from 'express'
import { Readable } from 'stream'
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
import { HttpInternalServerError } from '../server/HttpErrors'
import { Config } from "../server/Config"


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

    @Logger.LogFunction()
    static RequestToSchemaRequest(req: Request): TSchemaRequest {
        const { schemaName, entityName } = req.params

        // Merge body and query parameters into schemaRequest
        return <TSchemaRequest>{
            schemaName,
            entityName,
            ...req.body,
            ...req.query
        }
    }

    @Logger.LogFunction()
    static InternalResponseToResponse(res: Response, intRes: TInternalResponse): void {
        res.status(intRes.StatusCode).json(intRes.Body)
    }

    @Logger.LogFunction()
    static SchemaResponseToResponse(schemaResponse: TSchemaResponse, res: Response) {
        const { schemaName, entityName, transaction, result, status } = schemaResponse

        let resJson: TJson = {
            schemaName,
            entityName,
            transaction,
            result,
            status
        }

        res.status(schemaResponse.status)

        if (TypeHelper.IsSchemaResponseError(schemaResponse)) {
            return res
                .json({
                    ...resJson,
                    error: schemaResponse.error
                })
        }

        if (TypeHelper.IsSchemaResponseData(schemaResponse)) {
            resJson = {
                ...resJson,
                cache: schemaResponse.cache,
                metadata: schemaResponse.data.MetaData,
                fields: schemaResponse.data.Fields,
                rows: schemaResponse.data.Rows
            }
        }

        if (Config.Flags.EnableResponseChunk) {
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
            throw new HttpInternalServerError(`Stream error: ${error}`)
        })

        res.on('error', (error) => {
            throw new HttpInternalServerError(`Response stream error: ${error}`)
        })
    }


    static ReplacePlaceholders(value: string): string
    static ReplacePlaceholders(value: TJson[] | undefined): TJson[] | undefined
    static ReplacePlaceholders(value: object | TJson): object | TJson
    @Logger.LogFunction()
    static ReplacePlaceholders(value: string | object | TJson | TJson[] | undefined): string | object | TJson | TJson[] | undefined {
        if (value == undefined)
            return undefined

        if (typeof value === 'string') {
            const _placeholderRegex = /\$\{\{([^}]+)\}\}/g
            return value.replace(_placeholderRegex, (match, code) => {
                try {
                    const __result = Server.Sandbox.Evaluate(code)
                    return (__result === undefined)
                        ? ''
                        : __result.toString()
                } catch (error) {
                    Logger.Error(`Error evaluating code: ${code}, ${JsonHelper.Stringify(error)}`)
                    // Return the original placeholder if there's an error
                    return `$\{{${code}}}`
                }
            })
        }

        // deepcode ignore UsageOfUndefinedReturnValue: <please specify a reason of ignoring this>
        const _objectString = Convert.ReplacePlaceholders(JSON.stringify(value))
        return JsonHelper.TryParse(_objectString, {})
    }
}