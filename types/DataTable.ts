//
//
//
//
//
import _ from 'lodash'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const alasql = require('alasql')

import { TJson } from './TJson'

export type TRow = TJson
export type TRows = TRow[]
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

    public Name: string
    public Fields: TFields = <TFields>{}
    public Rows: TRows = <TRows>[]
    public MetaData: Record<string, unknown> = {}


    constructor(name: string | undefined, rows: TJson[] | undefined = undefined) {
        if (name === undefined) {
            throw new Error("undefined DataTable name")
        }
        this.Name = name

        if (rows) {
            if (_.isArray(rows)) {
                this.Set(rows)
            } else {
                this.Set(_.castArray(rows))
            }
        }
    }

    public Set(rows: TJson[] | undefined = undefined) {
        if (rows) {
            this.Rows = [...rows]
            this.SetFields()
        }
    }

    public SetFields() {
        const _cols: TJson = { ..._.head(this.Rows) }
        this.Fields = _.reduce(_cols, (result, value, key) => {
            _cols[key] = typeof (value)
            return _cols
        }, <TFields>{})
        return this
    }

    // TODO not tested
    public SetField(fieldName: string, type: string) {
        this.Fields[fieldName] = SqlToJsType[type] || 'unknown';
        return this;
    }    

    public GetFieldsNames(): string[] {
        return Object.keys(this.Fields)
    }

    public PrefixAllFields(prefix: string) {
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

    public UnPrefixAllfields() {
        if (this.Rows.length === 0) {
            return this
        }
        for (const _row of this.Rows) {
            for (const [__col, __value] of Object.entries(_row)) {
                let ___colNew = __col
                if (__col.includes('.')) {
                    ___colNew = __col.split('.')[1]
                }
                if (_row[___colNew] === undefined) {
                    _row[___colNew] = __value
                    delete _row[__col]
                }
            }
        }
        return this.SetFields()
    }

    // TODO not tested
    public AddField(fieldName: string, fieldType: string) {
        this.FreeSql(`ALTER TABLE ${this.Name} ADD COLUMN ${fieldName} ${fieldType}`)
        this.SetField(fieldName, fieldType)
        return this
    }

    public FreeSql(sqlQuery: string) {
        alasql.options.errorlog = true
        alasql(`CREATE TABLE ${this.Name}`)
        alasql.tables[this.Name].data = this.Rows
        alasql(sqlQuery)
        this.Rows = alasql.tables[this.Name].data
        return this.SetFields()
    }

    public LeftJoin(dtB: DataTable, leftFieldName: string, rightFieldName: string) {
        this.Rows = alasql(`
            SELECT * FROM ? ${this.Name} 
            LEFT JOIN ? ${dtB.Name} 
            ON ${this.Name}.${leftFieldName} = ${dtB.Name}.${rightFieldName}`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    public InnerJoin(dtB: DataTable, leftFieldName: string, rightFieldName: string) {
        this.Rows = alasql(`
            SELECT * FROM ? ${this.Name} 
            INNER JOIN ? ${dtB.Name} 
            ON ${this.Name}.${leftFieldName} = ${dtB.Name}.${rightFieldName}`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    public RightJoin(dtB: DataTable, leftFieldName: string, rightFieldName: string) {
        this.Rows = alasql(`
            SELECT * FROM ? ${this.Name} 
            RIGHT JOIN ? ${dtB.Name} 
            ON ${this.Name}.${leftFieldName} = ${dtB.Name}.${rightFieldName}`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    public FullOuterJoin(dtB: DataTable, leftFieldName: string, rightFieldName: string) {
        this.Rows = alasql(`
            SELECT * FROM ? ${this.Name} 
            FULL OUTER JOIN ? ${dtB.Name} 
            ON ${this.Name}.${leftFieldName} = ${dtB.Name}.${rightFieldName}`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    public CrossJoin(dtB: DataTable) {
        this.Rows = alasql(`
            SELECT * FROM ? ${this.Name} 
            CROSS JOIN ? ${dtB.Name}`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    public SelectFields(fields: string[]) {
        if (this.Rows.length === 0 || fields.length === 0)
            return this

        this.Rows = alasql(`
            SELECT ${_.join(fields, ',')} 
            FROM ? ${this.Name}`,
            [this.Rows]
        )
        return this.SetFields()
    }

    public Sort(fields: string[], orders: TOrder[]) {
        this.Rows = _.orderBy(this.Rows, fields, orders)
        return this
    }

    public SetMetaData(metadata: string, value: unknown) {
        this.MetaData[metadata] = value
    }
}