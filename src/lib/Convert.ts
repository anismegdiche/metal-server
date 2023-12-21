//
//
//
//
//
import _ from 'lodash'
import { Request, Response } from 'express'

import { TSchemaRequest } from '../types/TSchemaRequest'
import { TJson } from '../types/TJson'
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseError } from '../types/TSchemaResponse'
import { Logger } from "../lib/Logger"
import { TInternalResponse } from '../types/TInternalResponse'


export class Convert {

    static OptionsFilterExpressionToSqlWhere(filterExpression: string) {
        let sqlCondition = JSON.stringify(filterExpression)

        // booleans
        sqlCondition = sqlCondition
            .replace(/&(?=(?:[^']*'[^']*')*[^']*$)/g, " AND ")
            .replace(/\|(?=(?:[^']*'[^']*')*[^']*$)/g, " OR ")
            .replace(/![^=](?=(?:[^']*'[^']*')*[^']*$)/g, " NOT ")

        // like
        sqlCondition = sqlCondition.replace(/~(?=(?:[^']*'[^']*')*[^']*$)/g, " LIKE ")
        const quotedStringArray = sqlCondition.match(/'(.*?)'/g) ?? []
        for (const quotedString of quotedStringArray) {
            sqlCondition = sqlCondition.replace(quotedString, quotedString.replace(/\*/g, "%"))
        }

        // chars
        sqlCondition = sqlCondition.replace(/"(?=(?:[^']*'[^']*')*[^']*$)/g, "")

        return sqlCondition
    }

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

    static RequestToSchemaRequest(req: Request) {
        const { schema, entity } = req.params
        const { body, query } = req

        const schemaRequest: TSchemaRequest = {
            schema,
            entity
        }

        const _queryOrBody: TJson = (_.isNil(query) || _.isEmpty(query))
            ? body
            : query

        if (!_.isEmpty(_queryOrBody)) {
            Object.assign(schemaRequest, _queryOrBody)
            if (schemaRequest?.filter && typeof schemaRequest.filter === 'string') {
                schemaRequest.filter = JSON.parse(schemaRequest.filter)
            }
        }

        return schemaRequest
    }

    public static InternalResponseToResponse(res: Response, intRes: TInternalResponse): void {
        res.status(intRes.StatusCode).json(intRes.Body)
    }

    static SchemaResponseToResponse(schemaResponse: TSchemaResponse, response: Response) {
        const { schema, entity, transaction, result, status } = schemaResponse

        let _responseJson: TJson = {
            schema,
            entity,
            transaction,
            result,
            status
        }

        if ((<TSchemaResponseData>schemaResponse)?.data)
            _responseJson = {
                ..._responseJson,
                metadata: (<TSchemaResponseData>schemaResponse).data.MetaData,
                fields: (<TSchemaResponseData>schemaResponse).data.Fields,
                rows: (<TSchemaResponseData>schemaResponse).data.Rows
            }

        if ((<TSchemaResponseError>schemaResponse)?.error)
            _responseJson = {
                ..._responseJson,
                error: (<TSchemaResponseError>schemaResponse).error
            }

        return response
            .status(schemaResponse.status)
            .json(_responseJson)
    }

    // eslint-disable-next-line no-unused-vars
    static ReplacePlaceholders(text: string): string
    // eslint-disable-next-line no-unused-vars
    static ReplacePlaceholders(text: TJson[] | undefined): TJson[] | undefined
    // eslint-disable-next-line no-unused-vars
    static ReplacePlaceholders(text: object | TJson): object | TJson
    static ReplacePlaceholders(text: string | object | TJson | TJson[] | undefined): string | object | TJson | TJson[] | undefined {
        if (text === undefined)
            return undefined

        if (typeof text === 'string') {
            const _placeholderRegex = /\$\{\{([^}]+)\}\}/g
            return text.replace(_placeholderRegex, (match, code) => {
                try {
                    // Use eval with caution, make sure the code is safe
                    // eslint-disable-next-line no-eval
                    const __result = eval(code)
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
            const _objectString = Convert.ReplacePlaceholders(JSON.stringify(text))
            return JSON.parse(_objectString)
        }
    }
}