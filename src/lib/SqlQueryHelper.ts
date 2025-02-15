/* eslint-disable  */
//
//
//
//
//
import _ from 'lodash'
import tokenizer from 'sql-tokenizer'
import typia from "typia"
//
import { TRow } from "../types/DataTable"
import { TJson } from '../types/TJson'
import { Logger } from '../utils/Logger'
import { JsonHelper } from './JsonHelper'
import { HttpErrorInternalServerError } from "../server/HttpErrors"


//
export type TSqlToken = {
    token: string
    type: 'string' | 'number' | 'variable' | 'operator' | 'par-open' | 'par-closed'
}

export const ESCAPE_FIELD_VALUE = "$>"

//
export class SqlQueryHelper {

    Query: string = ''
    Data: object[] = []

    tokenize = tokenizer()

    // eslint-disable-next-line class-methods-use-this
    FnEscapeEntity: (entity: string) => string = (entity: string) => entity

    // eslint-disable-next-line class-methods-use-this
    FnEscapeField: (field: string) => string = (field: string) => field

    constructor(query?: string, fnEscapeEntity?: (entity: string) => string, fnEscapeField?: (field: string) => string) {
        if (query)
            this.SetQuery(query)

        if (fnEscapeEntity)
            this.FnEscapeEntity = fnEscapeEntity

        if (fnEscapeField)
            this.FnEscapeField = fnEscapeField
    }

    // eslint-disable-next-line class-methods-use-this
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
            // eslint-disable-next-line you-dont-need-lodash-underscore/is-string
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
        this.Query = String(query)
        return this
    }

    @Logger.LogFunction()
    Select(fields?: string): this {

        this.Query = (fields === undefined || fields === '*')
            ? `SELECT *`
            : `SELECT ${this.#EscapeFields(fields)}`

        return this
    }

    @Logger.LogFunction()
    From(entity: string): this {
        this.Query = `${this.Query} FROM ${this.FnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction()
    Where(condition?: string | object): this {
        // no filters
        if (condition === undefined)
            return this

        // filter-expression
        if (typeof condition === 'string' && condition.length > 0) {
            this.Query = `${this.Query} WHERE ${condition}`
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

            this.Query = `${this.Query} WHERE ${_cond}`
            return this
        }

        // eslint-disable-next-line you-dont-need-lodash-underscore/keys
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

            this.Query = `${this.Query} WHERE ${_cond}`
            return this
        }
        return this
    }

    @Logger.LogFunction()
    Delete(): this {
        this.Query = 'DELETE'
        return this
    }

    @Logger.LogFunction()
    Update(entity: string): this {
        this.Query = `UPDATE ${this.FnEscapeEntity(entity)}`
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

        this.Query = `${this.Query} SET ${setValues}`
        return this
    }

    @Logger.LogFunction()
    Insert(entity: string): this {
        this.Query = `INSERT INTO ${this.FnEscapeEntity(entity)}`
        return this
    }

    @Logger.LogFunction()
    Fields(fields?: string[] | string): this {
        if (!fields)
            return this

        this.Query = `${this.Query}(${this.#EscapeFields(fields)})`

        return this
    }

    @Logger.LogFunction()
    Values(data: TRow[]): this {
        if (Array.isArray(data) && data.length > 0) {
            this.Query = `${this.Query} VALUES`
            data.forEach((_values, _index) => {
                const newValues = _.chain(_values)
                    .mapValues((_value) => {
                        if (_value == null)
                            return

                        if (typeof _value === 'object') {
                            this.Data.push(_value)
                            return '?'
                        }
                        return `'${_value}'`
                    })
                    .values()
                    .join(',')
                    .value()

                this.Query = `${this.Query} (${newValues})`
                // multiple value join
                if (_index < data.length - 1) {
                    this.Query = `${this.Query}, `
                }
            })
        } else {
            // eslint-disable-next-line you-dont-need-lodash-underscore/values
            this.Query = `${this.Query} VALUES ('${_.values(data).join('\',\'')}')`
        }
        return this
    }

    @Logger.LogFunction()
    OrderBy(order?: TJson | string): this {
        if (typeof order !== 'string' && order !== undefined) {
            Logger.Error('SqlQueryHelper.OrderBy: order must be a string or undefined')
            return this
        }

        if (typeof order === 'string')
            this.Query = `${this.Query} ORDER BY ${order}`

        return this
    }

    #SanitizeTokenize(): string[] {
        const query = this.Query.trim()
        if (/^\d+(\.\d+)?$/.test(query)) {
            return [this.Query]
        }
        return this.tokenize(this.Query)
    }

    Tokenize(): TSqlToken[] {
        const tokens = _.chain(this.#SanitizeTokenize())
            .map(_.trim)
            .compact()
            .map((token: string) => {
                let tokenType = ''
                switch (true) {
                    case token === '(':
                        tokenType = 'par-open'
                        break
                    case token === ')':
                        tokenType = 'par-closed'
                        break
                    case ['+', '-', '*', '/'].includes(token):
                        tokenType = "operator"
                        break
                    case token.startsWith("'") && token.endsWith("'"):
                        tokenType = "string"
                        break
                    case !isNaN(parseInt(token)):
                    case !isNaN(parseFloat(token)):
                        tokenType = "number"
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