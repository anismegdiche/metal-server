//
//
//
//
//
import _ from 'lodash'
import { Request, Response } from 'express'
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TJson } from '../types/TJson'
import { TSchemaResponse } from '../types/TSchemaResponse'
import { Logger } from "../lib/Logger"
import { TInternalResponse } from '../types/TInternalResponse'
import { Server } from '../server/Server'
import { TypeHelper } from './TypeHelper'
import { Helper } from './Helper'


export class Convert {

    static SqlSortToMongoSort(key: any, value: string) {
        if (value.split(" ").length > 2) {
            return {}
        }

        const field = value.split(" ")[0]
        const sqlSortDirection = value.split(" ")[1].toLowerCase()
        const mongoSortDirection = (sqlSortDirection == "asc")
            ? 1
            : -1

        return {
            ...key,
            [field]: mongoSortDirection
        }
    }

    static JsonToArray(obj: TJson) {
        return _.map(_.entries(obj), ([k, v]) => ({ [k]: v }))
    }

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

    static InternalResponseToResponse(res: Response, intRes: TInternalResponse): void {
        res.status(intRes.StatusCode).json(intRes.Body)
    }

    static SchemaResponseToResponse(schemaResponse: TSchemaResponse, response: Response) {
        const { schemaName, entityName, transaction, result, status } = schemaResponse
        
        let _responseJson: TJson = {
            schemaName,
            entityName,
            transaction,
            result,
            status
        }

        if (TypeHelper.IsSchemaResponseData(schemaResponse))
            _responseJson = {
                ..._responseJson,
                cache: schemaResponse.cache,
                metadata: schemaResponse.data.MetaData,
                fields: schemaResponse.data.Fields,
                rows: schemaResponse.data.Rows
            }

        if (TypeHelper.IsSchemaResponseError(schemaResponse))
            _responseJson = {
                ..._responseJson,
                error: schemaResponse.error
            }

        return response
            .status(schemaResponse.status)
            .json(_responseJson)
    }

    // eslint-disable-next-line no-unused-vars
    static ReplacePlaceholders(value: string): string
    // eslint-disable-next-line no-unused-vars
    static ReplacePlaceholders(value: TJson[] | undefined): TJson[] | undefined
    // eslint-disable-next-line no-unused-vars
    static ReplacePlaceholders(value: object | TJson): object | TJson
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
                    Logger.Error(`Error evaluating code: ${code}, ${JSON.stringify(error)}`)
                    // Return the original placeholder if there's an error
                    return `$\{{${code}}}`
                }
            })
        } else {
            const _objectString = Convert.ReplacePlaceholders(JSON.stringify(value))
            return Helper.JsonTryParse(_objectString, {})
        }
    }
}