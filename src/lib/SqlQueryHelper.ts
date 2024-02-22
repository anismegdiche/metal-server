//
//
//
//
//
import _ from 'lodash'
//
import { TRow } from "../types/DataTable"
import { TJson } from '../types/TJson'
import { Logger } from './Logger'

export class SqlQueryHelper {
    Query: string = ''
    Data: object[] = []

    constructor(query?: string) {
        if (query)
            this.SetQuery(query)
    }

    SetQuery(query: string) {
        this.Query = query
        return this
    }

    Select(fields: TJson | string | undefined = undefined) {
        if (typeof fields === 'object') {
            Logger.Error('SqlQueryHelper.Select: fields must be a string or undefined')
            return this
        }
        this.Query = (fields === undefined)
            ? "SELECT *"
            : `SELECT ${fields}`
        return this
    }

    From(entity: string) {
        this.Query = `${this.Query} FROM ${entity}`
        return this
    }

    Where(condition: string | object | undefined = undefined) {
        if (condition === undefined) {
            return this
        }

        if (typeof condition === 'string' && condition.length > 0) {
            this.Query = `${this.Query} WHERE ${condition}`
            return this
        }

        if (Array.isArray(condition) && condition.length > 0) {
            const _cond = _
                .chain(condition)
                .map((__filter) => {
                    const ___formattedValue: string = typeof __filter === 'number'
                        ? Object.values(__filter)[0]
                        : `'${Object.values(__filter)[0]}'`
                    return `${Object.keys(__filter)[0]}=${___formattedValue}`
                })
                .join(' AND ')
                .value()

            this.Query = `${this.Query} WHERE ${_cond}`
            return this
        }

        if (typeof condition === 'object' && Object.keys(condition).length > 0) {
            const _cond = _
                .chain(condition)
                .map((__value, __key) => {
                    const ___formattedValue: string = typeof __value === 'number'
                        ? __value
                        : `'${__value}'`
                    return `${__key}=${___formattedValue}`
                })
                .join(' AND ')
                .value()

            this.Query = `${this.Query} WHERE ${_cond}`
            return this
        }
        return this
    }


    Delete() {
        this.Query = 'DELETE'
        return this
    }

    Update(entity: string) {
        this.Query = `UPDATE ${entity}`
        return this
    }

    Set(rows: TRow[] | TRow | undefined) {
        if (rows === undefined) {
            return this
        }

        let fieldsValues: TRow = <TRow>{}
        fieldsValues = (Array.isArray(rows))
            ? <TRow>(rows.at(0))
            : rows

        const setValues = _.chain(fieldsValues)
            .mapValues((_value, _field) => {
                let __formattedValue = ''
                switch (typeof _value) {
                    case 'string':
                        __formattedValue = `'${_value}'`
                        break
                    case 'number':
                        __formattedValue = _value.toString()
                        break
                    case 'object':
                        __formattedValue = '?'
                        if (_value != null)
                            this.Data.push(_value)
                        break
                    default:
                        __formattedValue = `'${JSON.stringify(_value)}'`
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

    Insert(entity: string) {
        this.Query = `INSERT INTO ${entity}`
        return this
    }

    Fields(data: string[] | string, sep: string = '') {
        const joinString = `${sep},${sep}`

        this.Query = Array.isArray(data)
            ? `${this.Query}(${sep}${data.join(joinString)}${sep})`
            : `${this.Query}(${data})`

        return this
    }

    Values(data: TRow[]): SqlQueryHelper {
        if (Array.isArray(data) && data.length > 0) {
            this.Query = `${this.Query} VALUES`
            data.forEach((_values, _index) => {
                const newValues = _.chain(_values)
                    .mapValues((_value, _field) => {
                        if (_value == null || _value == undefined)
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

                //XXX: if (_index < data.length - 1) {
                //XXX:     this.Query = `${this.Query}, `
                //XXX: }
            })
        } else {
            // eslint-disable-next-line you-dont-need-lodash-underscore/values
            this.Query = `${this.Query} VALUES ('${_.values(data).join('\',\'')}')`
        }
        return this
    }

    OrderBy(order: TJson | string | undefined = undefined) {
        if (typeof order !== 'string' && order !== undefined) {
            Logger.Error('SqlQueryHelper.OrderBy: order must be a string or undefined')
            return this
        }

        if (typeof order === 'string') {
            this.Query = `${this.Query} ORDER BY ${order}`
        }

        return this
    }
}