//
//
//
//
//
import _ from 'lodash'
import typia from "typia"
//
import { TOrderBy, TRow } from "../types/DataTable"
import { Logger } from '../utils/Logger'
import { JsonHelper } from './JsonHelper'
import { HttpErrorBadRequest, HttpErrorInternalServerError } from "../server/HttpErrors"


//
export type TSqlToken = {
    token: string
    type: 'string' | 'number' | 'variable' | 'operator' | 'par-open' | 'par-closed' | 'seperator' | 'command'
}

export const ESCAPE_FIELD_VALUE = "$>"

//
export class SqlQueryHelper {

    #Query: string = ''
    Data: object[] = []


    FnEscapeEntity: (entity: string) => string = (entity: string) => entity


    FnEscapeField: (field: string) => string = (field: string) => field

    constructor(query?: string, fnEscapeEntity?: (entity: string) => string, fnEscapeField?: (field: string) => string) {
        if (query)
            this.SetQuery(query)

        if (fnEscapeEntity)
            this.FnEscapeEntity = fnEscapeEntity

        if (fnEscapeField)
            this.FnEscapeField = fnEscapeField
    }


    #WhereCondition(field: string, value: unknown): string {
        // file deepcode ignore DuplicateCaseSwitch: simplicity
        switch (true) {
            case typia.is<string>(value):
                return `${field} = '${value}'`

            case typia.is<null>(value):
                return `${field} = NULL`

            case typia.is<undefined>(value):
                throw new HttpErrorInternalServerError(`SqlQueryHelper.Where: undefined value for field '${field}'`)

            case typia.is<number>(value):
            case typia.is<bigint>(value):
            case typia.is<boolean>(value):
            default:
                return `${field} = ${value}`
        }
    }

    #EscapeFields(fields?: string[] | string): string {
        if (!fields)
            return ""

        const cleanFields: string[] = []

        switch (true) {
            case Array.isArray(fields):
                cleanFields.push(...fields)
                break


            case _.isString(fields) && fields.includes(','):
                {
                    const _aFields = fields.split(',')
                    _aFields.forEach((__field) => {
                        cleanFields.push(__field.trim())
                    })
                    break
                }
            default:
                cleanFields.push(fields.trim())
                break
        }

        if (cleanFields.length === 0)
            return ""

        return _.chain(cleanFields)
            .map(this.FnEscapeField)
            .join(',')
            .value()
    }

    @Logger.LogFunction()
    SetQuery(query: string): this {
        this.#Query = String(query)
        return this
    }

    Query(): string {
        if (this.#DetectSQLInjection())
            throw new HttpErrorBadRequest('SQL Injection detected')

        return this.#Query
    }

    @Logger.LogFunction()
    Select(fields?: string): this {

        this.#Query = (fields === undefined || fields === '*')
            ? `SELECT *`
            : `SELECT ${this.#EscapeFields(fields)}`

        return this
    }

    @Logger.LogFunction()
    From(entity: string): this {
        this.#Query = `${this.#Query} FROM ${this.FnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction()
    Where(condition?: string | object): this {
        // no filters
        if (condition === undefined)
            return this

        // filter-expression
        if (typeof condition === 'string' && condition.length > 0) {
            this.#Query = `${this.#Query} WHERE ${condition}`
            return this
        }

        // filter
        if (Array.isArray(condition) && condition.length > 0) {
            const _cond = _
                .chain(condition)
                .map((__filter) => {
                    const [___field] = Object.keys(__filter)
                    const [___value] = Object.values(__filter)

                    if (!___field)
                        return ''

                    return this.#WhereCondition(this.FnEscapeField(___field), ___value)
                })
                .join(' AND ')
                .value()

            this.#Query = `${this.#Query} WHERE ${_cond}`
            return this
        }


        if (typeof condition === 'object' && _.keys(condition).length > 0) {
            const _cond = _
                .chain(condition)
                .map((__value, __field) => {

                    if (!__field)
                        return ''

                    return this.#WhereCondition(this.FnEscapeField(__field), __value)
                })
                .join(' AND ')
                .value()

            this.#Query = `${this.#Query} WHERE ${_cond}`
            return this
        }
        return this
    }

    @Logger.LogFunction()
    Delete(): this {
        this.#Query = 'DELETE'
        return this
    }

    @Logger.LogFunction()
    Update(entity: string): this {
        this.#Query = `UPDATE ${this.FnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction()
    Set(rows?: TRow[] | TRow): this {
        if (rows === undefined)
            return this

        let fieldsValues: TRow = {}
        fieldsValues = (Array.isArray(rows))
            ? rows[0]
            : rows

        const setValues = _.chain(fieldsValues)
            .mapValues((_value, _field) => {
                let __formattedValue = ''
                switch (true) {
                    case typeof _value === 'string' && _value.startsWith(ESCAPE_FIELD_VALUE):
                        __formattedValue = `${_value.slice(ESCAPE_FIELD_VALUE.length).trim()}`
                        break
                    case typeof _value === 'string':
                        __formattedValue = `'${_value}'`
                        break
                    case typeof _value === 'number':
                        __formattedValue = _value.toString()
                        break
                    case typeof _value === 'object':
                        __formattedValue = '?'
                        if (_value != null)
                            this.Data.push(_value)
                        break
                    default:
                        __formattedValue = `'${JsonHelper.Stringify(_value)}'`
                        break
                }
                return `${_field}=${__formattedValue}`
            })
            .values()
            .join(',')
            .value()

        this.#Query = `${this.#Query} SET ${setValues}`
        return this
    }

    @Logger.LogFunction()
    Insert(entity: string): this {
        this.#Query = `INSERT INTO ${this.FnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction()
    Fields(fields?: string[] | string): this {
        if (!fields)
            return this

        this.#Query = `${this.#Query}(${this.#EscapeFields(fields)})`

        return this
    }

    @Logger.LogFunction()
    Values(data: TRow[]): this {
        if (Array.isArray(data) && data.length > 0) {
            this.#Query = `${this.#Query} VALUES`
            data.forEach((_values, _index) => {
                const newValues = _.chain(_values)
                    .mapValues((_value) => {
                        switch (true) {
                            case _value == null:
                                return
                            case !isNaN(parseInt(_value as string, 10)):
                            case !isNaN(parseFloat(_value as string)):
                                return `${_value}`
                            case typeof _value === 'object':
                                this.Data.push(_value)
                                return '?'
                            default:
                                return `'${_value}'`
                        }
                    })
                    .values()
                    .join(',')
                    .value()

                this.#Query = `${this.#Query} (${newValues})`
                // multiple value join
                if (_index < data.length - 1) {
                    this.#Query = `${this.#Query}, `
                }
            })
        } else {


            this.#Query = `${this.#Query} VALUES ('${_.values(data).join('\',\'')}')`
        }
        return this
    }

    @Logger.LogFunction()
    OrderBy(order?: TOrderBy): this {
        if (!order)
            return this

        const _order = _.map(order, (value, key) => `${key} ${value!.toUpperCase()}`)
        this.#Query = `${this.#Query} ORDER BY ${_order.join(', ')}`
        return this
    }

    #SanitizeTokenize(): string[] {
        const query = this.#Query.trim()
        if ((/^\d+(\.\d+)?$/).test(query)) {
            return [this.#Query]
        }

        const tokens = _.chain(query.match(/(?:'[^']*'|[^,\s]+|,)/g))
            .map(_.trim)
            .compact()
            .value()


        const wherePos = _.findIndex(tokens, (word) => word.toUpperCase() === "WHERE")

        const setPos = _.findIndex(tokens, (word) => word.toUpperCase() === "SET")

        const pos = (wherePos != -1 && setPos != -1)
            ? Math.min(wherePos, setPos)
            : Math.max(wherePos, setPos)

        let beforeClause: string[] = []
        let afterClause: string[] = []

        if (pos !== -1) {

            beforeClause = _.slice(tokens, 0, pos)

            afterClause = _.slice(tokens, pos)

            afterClause = _.chain(afterClause)
                .map((token) => {
                    return (token.startsWith("'") && token.endsWith("'"))
                        ? token
                        : token.replace(/[+\-*/=]/g, match => ` ${match} `)
                })
                .map(token => {
                    return (token.startsWith("'") && token.endsWith("'"))
                        ? token
                        : token.split(' ')
                })
                .flatten()
                .map(_.trim)
                .compact()
                .value()


            return _.concat(beforeClause, afterClause)
        }
        return tokens
    }

    Tokenize(): TSqlToken[] {
        const tokens = _.chain(this.#SanitizeTokenize())
            .map((token: string) => {
                let tokenType = ''
                switch (true) {
                    case ['SELECT', 'UPDATE', 'INSERT', 'DELETE', 'SET', 'FROM', 'WHERE', 'LIKE', 'ORDER', 'BY', 'ASC', 'DESC'].includes(token.toUpperCase()):
                        tokenType = "command"
                        break
                    case token === '(':
                        tokenType = 'par-open'
                        break
                    case token === ')':
                        tokenType = 'par-closed'
                        break
                    case ['+', '-', '*', '/', '='].includes(token):
                        tokenType = "operator"
                        break
                    case token.startsWith("'") && token.endsWith("'"):
                        tokenType = "string"
                        break
                    case !isNaN(parseInt(token, 10)):
                    case !isNaN(parseFloat(token)):
                        tokenType = "number"
                        break
                    case token === ',':
                        tokenType = "seperator"
                        break
                    default:
                        tokenType = "variable"
                        break
                }

                return <TSqlToken>{
                    token,
                    type: tokenType
                }
            })
            .value()

        return tokens as any[]
    }

    #DetectSQLInjection() {
        const denyWords = [
            "DROP",
            "ALTER",
            "EXEC",
            "EXECUTE",
            "DECLARE",
            "CAST",
            "CONVERT",
            "UNION",
            "TABLE",
            "PROCEDURE",
            "FUNCTION"
        ]

        const tokens = this.Tokenize()
        if (tokens.some(token => denyWords.includes(token.token.toUpperCase())))
            return true

        for (let i = 0; i < tokens.length - 2; i += 1) {
            if (
                tokens[i].type === "number" &&
                tokens[i + 1].type === "operator" &&
                tokens[i + 1].token === "=" &&
                tokens[i + 2].type === "number"
            ) {
                return true
            }
        }

        const sqlInjectionPatterns = [
            /(--|#|\/\*)/i, // Comments like --, #, /*
            /(;|\|\|)/i // SQL operators like OR, AND, ;
        ]

        // Detect all CRUD combinations in the same query
        const mixedCrudPatterns = [
            /\bSELECT\b.*\bINSERT\b|\bINSERT\b.*\bSELECT\b/i, // SELECT + INSERT
            /\bSELECT\b.*\bUPDATE\b|\bUPDATE\b.*\bSELECT\b/i, // SELECT + UPDATE
            /\bSELECT\b.*\bDELETE\b|\bDELETE\b.*\bSELECT\b/i, // SELECT + DELETE
            /\bINSERT\b.*\bUPDATE\b|\bUPDATE\b.*\bINSERT\b/i, // INSERT + UPDATE
            /\bINSERT\b.*\bDELETE\b|\bDELETE\b.*\bINSERT\b/i, // INSERT + DELETE
            /\bUPDATE\b.*\bDELETE\b|\bDELETE\b.*\bUPDATE\b/i, // UPDATE + DELETE
            // All four CRUD operations together
            /\bSELECT\b.*\bINSERT\b.*\bUPDATE\b.*\bDELETE\b|\bDELETE\b.*\bUPDATE\b.*\bINSERT\b.*\bSELECT\b/i
        ]

        return (
            sqlInjectionPatterns.some(pattern => pattern.test(this.#Query)) ||
            mixedCrudPatterns.some(pattern => pattern.test(this.#Query))
        )
    }
}