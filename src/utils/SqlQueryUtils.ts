//
//
//
import _ from 'lodash'
//
import { TOrderBy, TRow } from "../types/DataTable"
import { Logger } from './Logger'
import { JsonUtils } from './JsonUtils'
import { HttpErrorBadRequest, HttpErrorInternalServerError } from "../modules/errors/HttpErrors"


//
export type TSqlToken = {
    token: string
    type: 'string' | 'number' | 'variable' | 'operator' | 'par-open' | 'par-closed' | 'seperator' | 'command'
}

export const ESCAPE_FIELD_VALUE = "$>"

//
export class SqlQueryUtils {

    #query: string = ''
    Data: object[] = []

    // eslint-disable-next-line class-methods-use-this
    #fnEscapeEntity: (entity: string) => string = (entity: string) => entity

    // eslint-disable-next-line class-methods-use-this
    #fnEscapeField: (field: string) => string = (field: string) => field

    constructor(query?: string, fnEscapeEntity?: (entity: string) => string, fnEscapeField?: (field: string) => string) {
        if (query)
            this.SetQuery(query)

        if (fnEscapeEntity)
            this.#fnEscapeEntity = fnEscapeEntity

        if (fnEscapeField)
            this.#fnEscapeField = fnEscapeField
    }


    // eslint-disable-next-line class-methods-use-this
    #whereCondition(field: string, value: unknown): string {
        // file deepcode ignore DuplicateCaseSwitch: simplicity
        switch (true) {
            case typeof value === 'string':
                return `${field} = '${value}'`

            case value === null:
                return `${field} = NULL`

            case value === undefined:
                throw new HttpErrorInternalServerError(`SqlQueryHelper.Where: undefined value for field '${field}'`)

            case typeof value === 'number':
            case typeof value === 'bigint':
            case typeof value === 'boolean':
            default:
                return `${field} = ${value}`
        }
    }

    #escapeFields(fields?: string[] | string): string {
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
            .map(this.#fnEscapeField)
            .join(', ')
            .value()
            .trim()
    }

    #formatValue(_value: any): string | undefined {
        switch (true) {
            case _value == null:
                return undefined
            case typeof _value === 'string' && _value.startsWith(ESCAPE_FIELD_VALUE):
                return _value.slice(ESCAPE_FIELD_VALUE.length).trim()
            case typeof _value === 'string':
                return `'${_value.replace(/'/g, "''")}'`
            case typeof _value === 'number':
            case !isNaN(parseInt(_value as string, 10)):
            case !isNaN(parseFloat(_value as string)):
                return _value.toString()
            case typeof _value === 'object':
                this.Data.push(_value)
                return '?'
            default:
                return `'${JsonUtils.Stringify(_value).replace(/'/g, "''")}'`
        }
    }

    #sanitizeTokenize(): string[] {
        const query = this.#query.trim()
        if ((/^\d+(\.\d+)?$/).test(query)) {
            return [this.#query]
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

    #detectSQLInjection() {
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
            sqlInjectionPatterns.some(pattern => pattern.test(this.#query)) ||
            mixedCrudPatterns.some(pattern => pattern.test(this.#query))
        )
    }

    @Logger.LogFunction(true)
    SetQuery(query: string): this {
        this.#query = String(query)
        return this
    }

    Query(): string {
        if (this.#detectSQLInjection())
            throw new HttpErrorBadRequest('SQL Injection detected')

        return this.#query
    }

    @Logger.LogFunction(true)
    Select(fields?: string): this {

        this.#query = (fields === undefined || fields === '*')
            ? `SELECT *`
            : `SELECT ${this.#escapeFields(fields)}`

        return this
    }

    @Logger.LogFunction(true)
    From(entity: string): this {
        this.#query = `${this.#query} FROM ${this.#fnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction(true)
    Where(condition?: string | object): this {
        // no filters
        if (condition === undefined)
            return this

        // filter-expression
        if (typeof condition === 'string' && condition.length > 0) {
            this.#query = `${this.#query} WHERE ${condition}`
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

                    return this.#whereCondition(this.#fnEscapeField(___field), ___value)
                })
                .join(' AND ')
                .value()

            this.#query = `${this.#query} WHERE ${_cond}`
            return this
        }


        if (typeof condition === 'object' && _.keys(condition).length > 0) {
            const _cond = _
                .chain(condition)
                .map((__value, __field) => {

                    if (!__field)
                        return ''

                    return this.#whereCondition(this.#fnEscapeField(__field), __value)
                })
                .join(' AND ')
                .value()

            this.#query = `${this.#query} WHERE ${_cond}`
            return this
        }
        return this
    }

    @Logger.LogFunction(true)
    Delete(): this {
        this.#query = 'DELETE'
        return this
    }

    @Logger.LogFunction(true)
    Update(entity: string): this {
        this.#query = `UPDATE ${this.#fnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction(true)
    Set(rows?: TRow[] | TRow): this {
        if (rows === undefined)
            return this

        let fieldsValues: TRow = {}
        fieldsValues = (Array.isArray(rows))
            ? rows[0]
            : rows

        const setValues = _.chain(fieldsValues)
            .mapValues((_value, _field) => {
                const formattedValue = this.#formatValue(_value)
                return formattedValue === undefined
                    ? ''
                    : `${_field} = ${formattedValue}`
            })
            .values()
            .filter(Boolean)
            .join(', ')
            .value()

        if (setValues) {
            this.#query = `${this.#query} SET ${setValues}`.trim()
        }
        return this
    }

    @Logger.LogFunction(true)
    Insert(entity: string): this {
        this.#query = `INSERT INTO ${this.#fnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction(true)
    Fields(fields?: string[] | string): this {
        if (!fields)
            return this

        this.#query = `${this.#query}(${this.#escapeFields(fields)})`

        return this
    }

    @Logger.LogFunction(true)
    Values(data: TRow[]): this {
        if (Array.isArray(data) && data.length > 0) {
            this.#query = `${this.#query} VALUES`
            data.forEach((_values, _index) => {
                const newValues = _.chain(_values)
                    .mapValues((_value) => this.#formatValue(_value))
                    .values()
                    .filter((val): val is string => val !== undefined)
                    .join(', ')
                    .value()

                this.#query = `${this.#query} (${newValues.trim()})`
                // multiple value join
                if (_index < data.length - 1) {
                    this.#query = `${this.#query}, `
                }
            })
        } else if (data && typeof data === 'object') {
            const values = _.values(data)
                .map(val => this.#formatValue(val))
                .filter((val): val is string => val !== undefined)
                .join(',')
            this.#query = `${this.#query} VALUES (${values})`
        }
        return this
    }

    @Logger.LogFunction(true)
    OrderBy(order?: TOrderBy): this {
        if (!order)
            return this

        const _order = _.map(order, (value, key) => `${key} ${value!.toUpperCase()}`)
        this.#query = `${this.#query} ORDER BY ${_order.join(', ')}`
        return this
    }

    Tokenize(): TSqlToken[] {
        const tokens = _.chain(this.#sanitizeTokenize())
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
}