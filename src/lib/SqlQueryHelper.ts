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
    Query = ''

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

        if (Array.isArray(condition)  && condition.length > 0) {
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

    // TODO: review datatype
    Set(fieldsValues: TRow[] | TRow | undefined) {
        if (fieldsValues === undefined) {
            return this
        }

        let _fieldsValues: TRow = <TRow>{}
        _fieldsValues = (Array.isArray(fieldsValues))
            ? <TRow>(_.head(fieldsValues))
            : fieldsValues

        const _setValues = _.chain(_fieldsValues)
            .mapValues((__value, __field) => {
                const ___formattedValue = typeof __value === 'number'
                    ? __value
                    : `'${__value}'`
                return `${__field}=${___formattedValue}`
            })
            .values()
            .join(',')
            .value()

        this.Query = `${this.Query} SET ${_setValues}`
        return this
    }

    Insert(entity: string) {
        this.Query = `INSERT INTO ${entity}`
        return this
    }

    Fields(data: string[] | string) {
        if (typeof data === 'string')
            this.Query = `${this.Query}(${data})`
        else
            this.Query = `${this.Query}(${_.join(data, ",")})`
        return this
    }

    Values(data: TRow[]): SqlQueryHelper {
        if (Array.isArray(data) && data.length > 0) {
            this.Query = `${this.Query} VALUES`
            data.forEach((_values, _index) => {
                // eslint-disable-next-line you-dont-need-lodash-underscore/values
                this.Query = `${this.Query} ('${_.values(_values).join('\',\'')}')`
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