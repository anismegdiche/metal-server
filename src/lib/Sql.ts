//
//
//
//
//
import _ from 'lodash'
import { TRow, TRows } from "../types/DataTable"
import { TJson } from '../types/TJson'
import { Logger } from '../lib/Logger'

export class SqlQueryHelper {
    public Query = ''

    constructor(query?: string) {
        if (query)
            this.SetQuery(query)
    }

    public SetQuery(query: string) {
        this.Query = query
        return this
    }

    public Select(fields: TJson | string | undefined = undefined) {
        if (typeof fields === 'object') {
            Logger.Error('SqlQueryHelper.Select: fields must be a string or undefined')
            return this
        }
        this.Query = (fields === undefined)
            ? "SELECT *"
            : `SELECT ${fields}`
        return this
    }

    public From(entity: string) {
        this.Query = `${this.Query} FROM ${entity}`
        return this
    }

    public Where(condition: string | object | undefined = undefined) {
        if (condition === undefined) {
            return this
        }

        if (typeof condition === 'string') {
            this.Query = `${this.Query} WHERE ${condition}`
        }

        if (typeof condition === 'object') {
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
        }
        return this
    }


    public Delete() {
        this.Query = 'DELETE'
        return this
    }

    public Update(entity: string) {
        this.Query = `UPDATE ${entity}`
        return this
    }

    // TODO: review datatype
    Set(fieldsValues: TRows | TRow | undefined) {
        if (fieldsValues === undefined) {
            return this
        }

        let _fieldsValues: TRow = <TRow>{}
        _fieldsValues = (_.isArray(fieldsValues))
            ? <TRow>(_.head(fieldsValues))
            : fieldsValues

        const _setValues = _.chain(_fieldsValues)
            .mapValues((__value, __field) => {
                let ___formattedValue = __value
                if (typeof __value !== 'number') {
                    ___formattedValue = `'${__value}'`
                }
                return `${__field}=${___formattedValue}`
            })
            .values()
            .join(',')
            .value()

        this.Query = `${this.Query} SET ${_setValues}`
        return this
    }

    public Insert(entity: string) {
        this.Query = `INSERT INTO ${entity}`
        return this
    }

    public Fields(data: string[] | string) {
        if (typeof data === 'string')
            this.Query = `${this.Query}(${data})`
        else
            this.Query = `${this.Query}(${_.join(data, ",")})`
        return this
    }

    Values(data: TRows): SqlQueryHelper {
        if (Array.isArray(data) && data.length > 0) {
            this.Query = `${this.Query} VALUES`
            data.forEach((_values, _index) => {
                this.Query = `${this.Query} ('${Object.values(_values).join('\',\'')}')`
                if (_index < data.length - 1) {
                    this.Query = `${this.Query}, `
                }
            })
        } else {
            this.Query = `${this.Query} VALUES ('${Object.values(data).join('\',\'')}')`
        }
        return this
    }

    public OrderBy(order: TJson | string | undefined = undefined) {
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