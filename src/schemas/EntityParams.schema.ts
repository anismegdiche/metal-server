//
//
//
//
//
import _ from "lodash"
//
import { VALIDATION_ERROR_MESSAGE } from "../lib/Const"

export const EntityParamsSchema: any = {
    schemaName: {
        in: ['params'],
        trim: true,
        isString: true,
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
    },
    entityName: {
        in: ['params'],
        trim: true,
        isString: true,
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
    },
    filter: {
        in: ['body', 'query'],
        trim: true,
        optional: true,
        custom: {
            options: (value: string, { req }: any) => {
                if (req.method === 'GET' && typeof value === 'string') {
                    try {
                        JSON.parse(value)
                        return true
                     
                    } catch (error) {
                        return false
                    }
                }
                return true
            }
        },
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_JSON,
        customSanitizer: {
            options: (value: string) => {
                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value)
                     
                    } catch (error) {
                        return value
                    }
                }
                return value
            }
        }
    },
    filterExpression: {
        in: ['body', 'query'],
        trim: true,
        optional: true,
        isString: true,
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
    },
    fields: {
        in: ['body', 'query'],
        trim: true,
        optional: true,
        isString: true,
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
    },
    sort: {
        in: ['body', 'query'],
        trim: true,
        optional: true,
        isString: true,
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_STRING
    },
    cache: {
        in: ['body', 'query'],
        trim: true,
        optional: true,
        isNumeric: true,
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_NUMBER,
        customSanitizer: {
            options: (value: string) => {
                if (typeof value === 'string') {
                    const parsedValue = parseFloat(value)
                    if (!isNaN(parsedValue)) {
                        return parsedValue
                    }
                }
                return value
            }
        }
    },
    data: {
        in: ['body'],
        optional: true,
        custom: {
            options: (value: any) => {
                return (_.isObject(value) || Array.isArray(value))
            }
        },
        errorMessage: VALIDATION_ERROR_MESSAGE.MUST_BE_JSON_ARRAY_OR_OBJECT
    }
}