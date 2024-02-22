//
//
//
//
//
import _ from 'lodash'
import alasql from 'alasql'
//
import { TJson } from './TJson'
import { Logger } from '../lib/Logger'

export type TRow = TJson
export type TFields = TJson
export type TOrder = boolean | "asc" | "desc"

const SqlToJsType: TJson = {
    // Integer (number with truncation)
    smallint: 'number',
    integer: 'number',
    bigint: 'number',

    // Decimal (number)
    decimal: 'number',
    numeric: 'number',

    // Floating-Point (number)
    real: 'number',
    doubleprecision: 'number',

    // Serial (number with AUTO_INCREMENT)
    smallserial: 'number',
    serial: 'number',
    bigserial: 'number',

    // Monetary (number)
    money: 'number',

    // Character (string)
    charactervarying: 'string',
    varchar: 'string',
    nvarchar: 'string',
    character: 'string',
    char: 'string',
    nchar: 'string',
    text: 'string',

    // Binary Data Types
    // TBD - To Be Determined

    // Date/Time (string and Date)
    datestring: 'string',
    timestring: 'string',
    interval: 'number',
    dateobject: 'date',

    // Boolean (boolean)
    boolean: 'boolean',

    // Complex data types
    // Enumeration (array of strings or numbers)
    enum: 'enum',

    // Geometric Types
    // Not realized

    // Network Address Types
    // Not realized

    // Bit String
    // Not realized

    // Text Search
    // Not realized

    // UUID (string)
    uuid: 'string',

    // XML (object with special structure)
    xml: 'object',
    html: 'object',

    // JSON (object)
    json: 'object',
    jsonb: 'object',

    // Array (object)
    array: 'object',

    // Composite (object)
    composite: 'object',

    // Range (object)
    // Not yet realized

    // OID
    // Not realized yet

    // Graph data types
    // Class (realized with tables)
    class: 'object',

    // Object (object)
    object: 'object'

    // Document (object)
    // TBD - To Be Determined

    // Object reference (number or string)
    // TBD - To Be Determined

    // Domain
    // TBD - To Be Determined

    // Pseudo
    // Not yet realized
}


export class DataTable {

    Name: string
    Fields: TFields = <TFields>{}
    Rows: TRow[] = <TRow[]>[]
    MetaData: Record<string, unknown> = {}


    constructor(name: string | undefined, rows: TJson[] | undefined = undefined) {
        if (name === undefined) {
            throw new Error("undefined DataTable name")
        }
        this.Name = name

        if (rows) {
            if (Array.isArray(rows)) {
                this.Set(rows)
            } else {
                this.Set(_.castArray(rows))
            }
        }
    }

    Set(rows: TJson[] | undefined = undefined): this {
        if (rows) {
            this.Rows = [...rows]
            this.SetFields()
        }
        return this
    }

    SetFields(): this {
        const _cols: TJson = { ...this.Rows.at(0) }
        this.Fields = _.reduce(_cols, (result, value, key) => {
            _cols[key] = typeof (value)
            return _cols
        }, <TFields>{})
        return this
    }

    GetFieldNames(): string[] {
        // eslint-disable-next-line you-dont-need-lodash-underscore/keys
        return _.keys(this.Fields)
    }

    PrefixAllFields(prefix: string): this {
        if (this.Rows.length === 0)
            return this

        for (const __row of this.Rows) {
            for (const [___col, ___value] of Object.entries(__row)) {
                __row[`${prefix}.${___col}`] = ___value
                delete __row[___col]
            }
        }
        return this.SetFields()
    }

    UnPrefixAllfields(): this {
        if (this.Rows.length === 0) {
            return this
        }
        for (const _row of this.Rows) {
            for (const [__col, __value] of Object.entries(_row)) {
                const ___colNew = __col.includes('.')
                    ? __col.split('.')[1]
                    : __col
                if (_row[___colNew] === undefined) {
                    _row[___colNew] = __value
                    delete _row[__col]
                }
            }
        }
        return this.SetFields()
    }

    async FreeSql(sqlQuery: string | undefined, jsonData: object[] | undefined = undefined): Promise<this> {
        if (sqlQuery === undefined) {
            return this
        }

        alasql.options.errorlog = true

        alasql(`CREATE TABLE IF NOT EXISTS \`${this.Name}\``)

        alasql.tables[this.Name].data = this.Rows

        try {
            const _result = await alasql.promise(sqlQuery, jsonData)
                .then((r: any) => {
                    return r
                })
                .catch((error: any) => {
                    Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}', Error: ${error}`)
                    throw error
                })

            this.Rows = (typeof _result === 'object')
                ? _result
                : alasql.tables[this.Name].data

        } catch (error: any) {
            Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}'`)
        }
        return this.SetFields()
    }


    LeftJoin(dtB: this, leftFieldName: string, rightFieldName: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? \`${this.Name}\` 
            LEFT JOIN ? \`${dtB.Name}\` 
            ON \`${this.Name}\`.\`${leftFieldName}\` = \`${dtB.Name}\`.\`${rightFieldName}\``,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    InnerJoin(dtB: this, leftFieldName: string, rightFieldName: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? \`${this.Name}\` 
            INNER JOIN ? \`${dtB.Name}\` 
            ON \`${this.Name}\`.\`${leftFieldName}\` = \`${dtB.Name}\`.\`${rightFieldName}\``,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    RightJoin(dtB: this, leftFieldName: string, rightFieldName: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? \`${this.Name}\` 
            RIGHT JOIN ? \`${dtB.Name}\` 
            ON \`${this.Name}\`.\`${leftFieldName}\` = \`${dtB.Name}\`.\`${rightFieldName}\``,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    FullOuterJoin(dtB: this, leftFieldName: string, rightFieldName: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? \`${this.Name}\` 
            FULL OUTER JOIN ? \`${dtB.Name}\` 
            ON \`${this.Name}\`.\`${leftFieldName}\` = \`${dtB.Name}\`.\`${rightFieldName}\``,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    CrossJoin(dtB: this): this {
        this.Rows = alasql(`
            SELECT * FROM ? \`${this.Name}\` 
            CROSS JOIN ? \`${dtB.Name}\``,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    SelectFields(fields: string[]): this {
        if (this.Rows.length === 0 || fields.length === 0)
            return this

        this.Rows = alasql(`
            SELECT \`${_.join(fields, '`,`')}\` 
            FROM ? \`${this.Name}\``,
            [this.Rows]
        )
        return this.SetFields()
    }

    Sort(fields: string[], orders: TOrder[]): this {
        this.Rows = _.orderBy(this.Rows, fields, orders)
        return this
    }

    SetMetaData(metadata: string, value: unknown): this {
        this.MetaData[metadata] = value
        return this
    }

    AddRows(newRows: TJson | TJson[] | undefined = undefined): this {
        if (!newRows) {
            return this
        }

        this.Rows = Array.isArray(newRows)
            ? [...this.Rows, ...newRows]
            : [...this.Rows, newRows]

        return this.SetFields()
    }
}