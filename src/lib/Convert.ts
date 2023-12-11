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


export class Convert {

    static OptionsFilterExpressionToSql(filterExpression: string) {
        let _condition = JSON.stringify(filterExpression);

        // booleans
        _condition = _condition.replace(/&(?=(?:[^']*'[^']*')*[^']*$)/g, " AND ")
            .replace(/\|(?=(?:[^']*'[^']*')*[^']*$)/g, " OR ")
            .replace(/![^=](?=(?:[^']*'[^']*')*[^']*$)/g, " NOT ");

        // like
        _condition = _condition.replace(/~(?=(?:[^']*'[^']*')*[^']*$)/g, " LIKE ");
        const quotedStringArray = _condition.match(/'(.*?)'/g) ?? [];
        for (const quotedString of quotedStringArray) {
            _condition = _condition.replace(quotedString, quotedString.replace(/\*/g, "%"));
        }

        // chars
        _condition = _condition.replace(/"(?=(?:[^']*'[^']*')*[^']*$)/g, "");

        return _condition;
    }

    static SqlSortToMongoSort(key: any, value: string) {
        if (value.split(" ").length > 2) {
            return {}
        }
        const _field = value.split(" ")[0]
        const _sqlSortDirection = value.split(" ")[1].toLowerCase()

        let _mongoSortDirection = -1
        if (_sqlSortDirection == "asc") {
            _mongoSortDirection = 1
        }
        return {
            ...key,
            [_field]: _mongoSortDirection
        }
    }

    static JsonToArray(obj: TJson) {
        return _.map(_.entries(obj), ([k, v]) => ({ [k]: v }))
    }

    static RequestToSchemaRequest(req: Request) {
        const { schema, entity } = req.params
        const { body, query } = req

        const _schemaRequest: TSchemaRequest = {
            schema,
            entity
        }

        const _queryOrBody: TJson = (_.isNil(query) || _.isEmpty(query))
            ? body
            : query

        if (!_.isEmpty(_queryOrBody)) {
            Object.assign(_schemaRequest, _queryOrBody)
            if (_schemaRequest?.filter && typeof _schemaRequest.filter === 'string') {
                _schemaRequest.filter = JSON.parse(_schemaRequest.filter)
            }
        }

        return _schemaRequest
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
            const placeholderRegex = /\$\{\{([^}]+)\}\}/g
            const replacedString = text.replace(placeholderRegex, (match, code) => {
                try {
                    // Use eval with caution, make sure the code is safe
                    // eslint-disable-next-line no-eval
                    const result = eval(code)
                    return (result === undefined)
                        ? ''
                        : result.toString()
                } catch (error) {
                    Logger.Error(`Error evaluating code: ${code}, ${JSON.stringify(error)}`)
                    // Return the original placeholder if there's an error
                    return `$\{{${code}}}`
                }
            })
            return replacedString
        } else {
            const __objectString = Convert.ReplacePlaceholders(JSON.stringify(text))
            return JSON.parse(__objectString)
        }
    }
}