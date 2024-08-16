//
//
//
//
//
import _ from 'lodash'
import alasql from 'alasql'
import { createHash } from 'crypto'
//
import { TJson } from './TJson'
import { Logger } from '../lib/Logger'
import { JsonHelper } from "../lib/JsonHelper"


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


export type TRow = TJson
export type TFields = TJson
export type TMetaData = Record<string, unknown>
export type TOrder = boolean | "asc" | "desc"
export type TSyncReport = {
    AddedRows: TRow[]
    DeletedRows: TRow[]
    UpdatedRows: TRow[]
}

export class DataTable {
    Name: string
    Fields: TFields = {}
    Rows: TRow[] = []
    MetaData: TMetaData = {}

    constructor(name: string | undefined, rows: TJson[] | undefined = undefined, fields: TJson | undefined = undefined, metaData: TJson | undefined = undefined) {
        if (name === undefined)
            throw new Error("undefined DataTable name")

        this.Name = name

        if (rows)
            this.Set(Array.isArray(rows)
                ? rows
                : [rows])

        if (fields)
            this.Fields = fields as TFields

        if (metaData)
            this.MetaData = metaData as TMetaData
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
        return Object.keys(this.Fields)
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
        if (sqlQuery == undefined) {
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
            throw error
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
            SELECT \`${fields.join('`,`')}\` 
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

    SyncReport(dtDestination: DataTable, on: string, flags: { keepOnlyUpdatedValues: boolean } | undefined = undefined): TSyncReport {
        const sourceHasProperty = this.Rows.some(row => on in row)

        if (!sourceHasProperty) {
            throw Error(`DataTable.SyncReport: '${this.Name}' has no property '${on}'`)
        }

        const emptySyncReport = <TSyncReport>{
            AddedRows: <TRow[]>[],
            UpdatedRows: <TRow[]>[],
            DeletedRows: <TRow[]>[]
        }

        // Remove rows from source and destination that are equal
        const filteredSource: TRow[] = _.differenceWith(this.Rows, dtDestination.Rows, _.isEqual)
        const filteredDestination: TRow[] = _.differenceWith(dtDestination.Rows, this.Rows, _.isEqual)

        // Remove rows from destination that are not in source
        const DeletedRows: TRow[] = filteredDestination.filter(row => !filteredSource.some((srcRow: TRow) => _.isEqual(srcRow[on], row[on])))

        // Keep rows from source that are not in destination
        const AddedRows: TRow[] = filteredSource.filter(row => !filteredDestination.some((destRow: TRow) => _.isEqual(destRow[on], row[on])))

        // Keep rows from source that are in destination but have changed
        let UpdatedRows: TRow[] = _.differenceBy(filteredSource, AddedRows, on)

        if (DeletedRows.length == 0 && UpdatedRows.length == 0 && AddedRows.length == 0) {
            return emptySyncReport
        }

        if (flags?.keepOnlyUpdatedValues) {
            // DeletedRows = DeletedRows.map((row: TRow) => row[on]) as any []
            UpdatedRows = UpdatedRows.map(updatedRow => {
                const correspondingDestRow = filteredDestination.find(destRow => destRow[on] === updatedRow[on])
                if (correspondingDestRow) {
                    Object.keys(updatedRow).forEach(prop => {
                        if (prop !== on && _.isEqual(updatedRow[prop], correspondingDestRow[prop])) {
                            delete updatedRow[prop]
                        }
                    })
                }
                return updatedRow
            })
        }

        return <TSyncReport>{
            AddedRows,
            DeletedRows,
            UpdatedRows
        }
    }

    AnonymizeFields(fields: string | string[]): this {
        let _fields = (typeof fields === 'string')
            ? [fields]
            : fields

        if (_fields.at(0) == '*')
            _fields = this.GetFieldNames()

        this.Rows.forEach((_row, _idx) => {
            const _newRow = { ..._row }
            _fields.forEach(__field => {
                if (__field in _newRow) {
                    // deepcode ignore InsecureHash: used for data anonymization
                    _newRow[__field] = createHash('md5')
                        .update(_.toString(_newRow[__field]))
                        .digest('hex')
                }
            })
            this.Rows[_idx] = _newRow
        })
        return this
    }

    RemoveDuplicates(fields: string[] | undefined, method: string, strategy: string, condition: string | undefined = undefined): this {

        // no fields passed
        let _fields = (fields && fields.length > 0)
            ? fields
            : undefined

        const mapDeduplicated: Map<string, TRow> = new Map()

        this.Rows.forEach((row: TRow) => {
            let currentHash: string = ""

            const rowString = (_fields)
                ? _.pick(row, _fields)
                : row

            switch (method) {
                case 'hash':
                    currentHash = createHash('sha256').update(JsonHelper.Stringify(rowString)).digest('base64')
                    break
                case 'ignorecase':
                    currentHash = JsonHelper.Stringify(rowString).toLowerCase()
                    break
                case 'exact':
                default:
                    currentHash = JsonHelper.Stringify(rowString)
                    break
            }

            if (mapDeduplicated.has(currentHash)) {
                // duplicate row
                switch (strategy) {
                    case 'last':
                        mapDeduplicated.set(currentHash, row)
                        break
                    case 'min':
                        mapDeduplicated.set(
                            currentHash,
                            <TRow>_.minBy(
                                [mapDeduplicated.get(currentHash), row],
                                condition
                            )
                        )
                        break
                    case 'max':
                        mapDeduplicated.set(
                            currentHash,
                            <TRow>_.maxBy(
                                [mapDeduplicated.get(currentHash), row],
                                condition
                            )
                        )
                        break
                    case 'first':
                    default:
                        break
                }

            } else {
                // new row
                mapDeduplicated.set(currentHash, row)
            }
        })
        // set rows
        this.Rows = Array.from(mapDeduplicated.values())
        return this
    }
}