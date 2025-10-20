//
//
//
import _ from 'lodash'
//
import { TOrderBy, TRow } from "../types/DataTable"
import { Logger } from './Logger'
import { JsonUtils } from './JsonUtils'
import { HttpErrorBadRequest, HttpErrorInternalServerError } from "../modules/errors/HttpErrors"
import { TAny } from "../types/TAny"
import { StringUtils } from './StringUtils'

//
export const ESCAPE_FIELD_VALUE = "$>"

export enum SQL_TYPE {
    STRING = 'string',
    NUMBER = 'number',
    VARIABLE = 'variable',
    OPERATOR = 'operator',
    PAR_OPEN = 'par-open',
    PAR_CLOSED = 'par-closed',
    SEPERATOR = 'seperator',
    COMMAND = 'command',
    ERROR = 'error',
    TERMINATOR = 'terminator',
    COMMENT = 'comment'
}


//
export type TSqlToken = {
    token: string
    type: SQL_TYPE
}


//
export class SqlQueryUtils {

    QueryParams: TAny[] = []

    _query: string = ''
    _fnEscapeEntity: (entity: string) => string = (entity: string) => entity
    _fnEscapeField: (field: string) => string = (field: string) => field

    constructor(query?: string, fnEscapeEntity?: (entity: string) => string, fnEscapeField?: (field: string) => string) {
        if (query)
            this.SetQuery(query)

        if (fnEscapeEntity)
            this._fnEscapeEntity = fnEscapeEntity

        if (fnEscapeField)
            this._fnEscapeField = fnEscapeField
    }

    _whereCondition(field: string, value: unknown): string {
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

    _escapeFields(fields?: string[] | string): string {
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
            .map(this._fnEscapeField)
            .join(', ')
            .value()
            .trim()
    }

    _formatValue(value: any): string | undefined {
        switch (true) {
            case value === undefined:
            case value === null:
                return 'NULL'

            case typeof value === 'string' && value.startsWith(ESCAPE_FIELD_VALUE):
                return value.slice(ESCAPE_FIELD_VALUE.length).trim()

            case typeof value === 'string' && StringUtils.IsLatin(value):
                this.QueryParams.push(value)
                return '?'

            case typeof value === 'string':
                return `'${value.replace(/'/g, "''")}'`

            case typeof value === 'number':
            case !isNaN(parseInt(value as string, 10)):
            case !isNaN(parseFloat(value as string)):
                return value.toString()

            case typeof value === 'object':
                this.QueryParams.push(value)
                return '?'

            default:
                return `'${JsonUtils.Stringify(value).replace(/'/g, "''")}'`
        }
    }

    _sanitizeTokenize(): string[] {
        const query = this._query.trim()
        if ((/^\d+(\.\d+)?$/).test(query)) {
            return [this._query]
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

    _detectSqlInjection() {
        const DENY_WORDS = [
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
            "FUNCTION",
            "TRUNCATE",
            "RENAME",
            "SHUTDOWN",
            "CREATE",
            "GRANT",
            "REVOKE",
            "DENY",
            "WAITFOR",
            "SLEEP",
            "PG_SLEEP",
            "BENCHMARK",
            "xp_cmdshell",
            "sp_",
            "fn_",
            "sys.",
            "information_schema.",
            "pg_catalog."
        ]

        const RX_SQL_INJECTION = [
            /(--|#|\/\*)/i, // Comments like --, #, /*
            /(;|\|\|)/i // SQL operators like OR, AND, ;
        ]

        // Detect all CRUD combinations in the same query
        const RX_MIXED_CRUD = [
            /\bSELECT\b.*\bSELECT\b/i,                        // SELECT + SELECT
            /\bSELECT\b.*\bINSERT\b|\bINSERT\b.*\bSELECT\b/i, // SELECT + INSERT
            /\bSELECT\b.*\bUPDATE\b|\bUPDATE\b.*\bSELECT\b/i, // SELECT + UPDATE
            /\bSELECT\b.*\bDELETE\b|\bDELETE\b.*\bSELECT\b/i, // SELECT + DELETE
            /\bINSERT\b.*\bUPDATE\b|\bUPDATE\b.*\bINSERT\b/i, // INSERT + UPDATE
            /\bINSERT\b.*\bDELETE\b|\bDELETE\b.*\bINSERT\b/i, // INSERT + DELETE
            /\bUPDATE\b.*\bDELETE\b|\bDELETE\b.*\bUPDATE\b/i, // UPDATE + DELETE
            // All four CRUD operations together
            /\bSELECT\b.*\bINSERT\b.*\bUPDATE\b.*\bDELETE\b|\bDELETE\b.*\bUPDATE\b.*\bINSERT\b.*\bSELECT\b/i
        ]

        const tokens = this.Tokenize()
        const _tokensWithoutString = tokens.filter(token => token.type !== SQL_TYPE.STRING && token.type !== SQL_TYPE.ERROR)
        const _tokensWithErrors = tokens.filter(token => token.type === SQL_TYPE.ERROR)

        // check for errors in tokens
        if (_tokensWithErrors.length > 0)
            return true

        // check for deny words
        if (_tokensWithoutString.some(token => DENY_WORDS.includes(token.token.toUpperCase())))
            return true

        // for each token in  _tokensWithoutString check if RX_SQL_INJECTION
        if (_tokensWithoutString.some(token => RX_SQL_INJECTION.some(pattern => pattern.test(token.token))))
            return true

        // for each token in  _tokensWithoutString check if RX_MIXED_CRUD
        if (_tokensWithoutString.some(token => RX_MIXED_CRUD.some(pattern => pattern.test(token.token))))
            return true

        if (this._hasLiteralEquality(tokens))
            return true

        return (
            // RX_SQL_INJECTION.some(pattern => pattern.test(this._query)) ||
            RX_MIXED_CRUD.some(pattern => pattern.test(this._query.toUpperCase()))
        )
    }

    _hasLiteralEquality(tokens: TSqlToken[]) {
        for (let i = 0; i <= tokens.length - 3; i++) {
            const a = tokens[i], b = tokens[i + 1], c = tokens[i + 2];
            if (b.type === "operator" && b.token === "=") {
                if (a.type === "string" && c.type === "string") return true;
                if (a.type === "number" && c.type === "number") return true;
            }
        }
        return false;
    }


    @Logger.LogFunction(true)
    SetQuery(query: string): this {
        this._query = String(query)
        return this
    }

    Query(): string {
        if (this._detectSqlInjection())
            throw new HttpErrorBadRequest('SQL Injection detected')

        return this._query
    }

    @Logger.LogFunction(true)
    Select(fields?: string): this {

        this._query = (fields === undefined || fields === '*')
            ? `SELECT *`
            : `SELECT ${this._escapeFields(fields)}`

        return this
    }

    @Logger.LogFunction(true)
    From(entity: string): this {
        this._query = `${this._query} FROM ${this._fnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction(true)
    Where(condition?: string | object): this {
        // no filters
        if (condition === undefined)
            return this

        // filter-expression
        if (typeof condition === 'string' && condition.length > 0) {
            this._query = `${this._query} WHERE ${condition}`
            return this
        }

        // filter
        if (Array.isArray(condition) && condition.length > 0) {
            const _cond = _.chain(condition)
                .map((__filter) => {
                    const [___field] = Object.keys(__filter)
                    const [___value] = Object.values(__filter)

                    if (!___field)
                        return ''

                    return this._whereCondition(this._fnEscapeField(___field), ___value)
                })
                .join(' AND ')
                .value()

            this._query = `${this._query} WHERE ${_cond}`
            return this
        }


        if (typeof condition === 'object' && _.keys(condition).length > 0) {
            const _cond = _.chain(condition)
                .map((__value, __field) => {

                    if (!__field)
                        return ''

                    return this._whereCondition(this._fnEscapeField(__field), __value)
                })
                .join(' AND ')
                .value()

            this._query = `${this._query} WHERE ${_cond}`
            return this
        }
        return this
    }

    @Logger.LogFunction(true)
    Delete(): this {
        this._query = 'DELETE'
        return this
    }

    @Logger.LogFunction(true)
    Update(entity: string): this {
        this._query = `UPDATE ${this._fnEscapeEntity(entity)}`
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
                const formattedValue = this._formatValue(_value)
                return formattedValue === undefined
                    ? ''
                    : `${_field} = ${formattedValue}`
            })
            .values()
            .filter(Boolean)
            .join(', ')
            .value()

        if (setValues) {
            this._query = `${this._query} SET ${setValues}`.trim()
        }
        return this
    }

    @Logger.LogFunction(true)
    Insert(entity: string): this {
        this._query = `INSERT INTO ${this._fnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction(true)
    Fields(fields?: string[] | string): this {
        if (!fields)
            return this

        this._query = `${this._query}(${this._escapeFields(fields)})`

        return this
    }

    @Logger.LogFunction(true)
    Values(data: TRow[]): this {
        if (Array.isArray(data) && data.length > 0) {
            this._query = `${this._query} VALUES`
            data.forEach((_values, _index) => {
                const newValues = _.chain(_values)
                    .mapValues((_value) => this._formatValue(_value))
                    .values()
                    .filter((val): val is string => val !== undefined)
                    .join(', ')
                    .value()

                this._query = `${this._query} (${newValues.trim()})`
                // multiple value join
                if (_index < data.length - 1) {
                    this._query = `${this._query}, `
                }
            })
        } else if (data && typeof data === 'object') {
            const values = _.values(data)
                .map(_value => this._formatValue(_value))
                .filter((_value): _value is string => _value !== undefined)
                .join(',')
            this._query = `${this._query} VALUES (${values})`
        }
        return this
    }

    @Logger.LogFunction(true)
    OrderBy(order?: TOrderBy): this {
        if (!order)
            return this

        const _order = _.map(order, (value, key) => `${key} ${value!.toUpperCase()}`)
        this._query = `${this._query} ORDER BY ${_order.join(', ')}`
        return this
    }

    Tokenize(): TSqlToken[] {
        const tokens = _.chain(this._sanitizeTokenize())
            .map((token: string) => {
                let tokenType = ''
                switch (true) {
                    case ['SELECT', 'UPDATE', 'INSERT', 'DELETE', 'SET', 'FROM', 'WHERE', 'LIKE', 'ORDER', 'BY', 'ASC', 'DESC'].includes(token.toUpperCase()):
                        tokenType = SQL_TYPE.COMMAND
                        break
                    case token === '(':
                        tokenType = SQL_TYPE.PAR_OPEN
                        break
                    case token === ')':
                        tokenType = SQL_TYPE.PAR_CLOSED
                        break
                    case token === ';':
                        tokenType = SQL_TYPE.TERMINATOR
                        break
                    case ['#', '--', '/*', '*/', '//'].includes(token):
                        tokenType = SQL_TYPE.COMMENT
                        break
                    case ['+', '-', '*', '/', '='].includes(token):
                        tokenType = SQL_TYPE.OPERATOR
                        break
                    case token.startsWith("'") && token.endsWith("'"):
                        tokenType = SQL_TYPE.STRING
                        break
                    case !isNaN(parseInt(token, 10)):
                    case !isNaN(parseFloat(token)):
                        tokenType = SQL_TYPE.NUMBER
                        break
                    case token === ',':
                        tokenType = SQL_TYPE.SEPERATOR
                        break
                    case token.startsWith('"') && !token.endsWith('"'):
                    case token.startsWith("'") && !token.endsWith("'"):
                        tokenType = SQL_TYPE.ERROR
                        break
                    default:
                        tokenType = SQL_TYPE.VARIABLE
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