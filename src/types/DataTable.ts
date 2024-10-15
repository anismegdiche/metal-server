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
import { Logger } from '../utils/Logger'
import { JsonHelper } from "../lib/JsonHelper"
import { StringHelper } from "../lib/StringHelper"
import { HttpErrorInternalServerError } from "../server/HttpErrors"


export const enum SORT_ORDER {
    ASC = "asc",  // Ascending
    DESC = "desc" // Descending
}

export const enum REMOVE_DUPLICATES_METHOD {
    HASH = "hash",	            // Uses a hash function to generate unique values for each row based on specified key(s) for comparison.
    EXACT = "exact",	        // Performs an exact comparison of the specified key(s) to identify duplicates.
    IGNORE_CASE = "ignorecase"	// Performs a case insensitive comparison of the specified key(s) to identify duplicates.
    //   | "fuzzy"	            // Uses fuzzy matching techniques to identify duplicates based on similarity rather than exact match.
    //   | "script"	            // Executes a user-defined script to identify and handle duplicates.
    //   | "group"	            // Groups rows by specified key(s) and applies the deduplication strategy within each group.
    //   | "distinct"           // Removes duplicates by comparing all fields, not just specified key(s).
    //   | "custom"	            // Allows for a custom method defined by user logic or an external script.
}

export const enum REMOVE_DUPLICATES_STRATEGY {
    FIRST = "first",	 // Keeps the first occurrence of each duplicate row based on the specified key(s).
    LAST = "last",	     // Keeps the last occurrence of each duplicate row based on the specified key(s).
    HIGHEST = "highest", // Keeps the duplicate row with the highest value in a specified field.
    LOWEST = "lowest",	 // Keeps the duplicate row with the lowest value in a specified field.
    CUSTOM = "custom"	 // Allows for a custom strategy defined by user logic.
}

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
export type TSortOrder = boolean | SORT_ORDER
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

    constructor(name: string | undefined = undefined, rows: TJson[] | undefined = undefined, fields: TJson | undefined = undefined, metaData: TJson | undefined = undefined) {
        this.Name = name ?? crypto.randomUUID()
        if (rows)
            this.Set(Array.isArray(rows)
                ? rows
                : [rows])

        if (fields)
            this.Fields = fields

        if (metaData)
            this.MetaData = metaData as TMetaData
    }

    @Logger.LogFunction(Logger.Debug, true)
    Set(rows: TJson[] | undefined = undefined): this {
        if (rows) {
            this.Rows = [...rows]
            this.SetFields()
        }
        return this
    }

    @Logger.LogFunction()
    SetFields(): this {
        const _cols: TJson = { ...this.Rows[0] }
        // eslint-disable-next-line you-dont-need-lodash-underscore/reduce
        this.Fields = _.reduce(_cols, (result, value, key) => {
            _cols[key] = typeof (value)
            return _cols
        }, <TFields>{})
        return this
    }

    @Logger.LogFunction()
    GetFieldNames(): string[] {
        // eslint-disable-next-line you-dont-need-lodash-underscore/keys
        return _.keys(this.Fields)
    }

    @Logger.LogFunction()
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

    @Logger.LogFunction()
    UnPrefixAllfields(): this {
        if (this.Rows.length === 0)
            return this
        
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

    @Logger.LogFunction()
    FreeSql(sqlQuery: string | undefined, jsonData: object[] | undefined = undefined): this {
        if (sqlQuery == undefined)
            return this

        alasql.options.errorlog = true
        alasql(`CREATE TABLE IF NOT EXISTS [${this.Name}]`)
        alasql.tables[this.Name].data = this.Rows

        try {
            const _result = alasql(sqlQuery, jsonData)
            this.Rows = (typeof _result === 'object')
                ? _result
                : alasql.tables[this.Name].data

        } catch (error: any) {
            Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}'`)
            throw error
        }
        return this.SetFields()
    }

    @Logger.LogFunction()
    async FreeSqlAsync(sqlQuery: string | undefined, jsonData: object[] | undefined = undefined): Promise<this> {
        if (sqlQuery == undefined)
            return this

        alasql.options.errorlog = true
        alasql(`CREATE TABLE IF NOT EXISTS [${this.Name}]`)
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


    @Logger.LogFunction()
    LeftJoin(dtB: this, leftFieldName: string, rightFieldName: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? [${this.Name}] 
            LEFT JOIN ? [${dtB.Name}] 
            ON [${this.Name}].[${leftFieldName}] = [${dtB.Name}].[${rightFieldName}]`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    @Logger.LogFunction()
    InnerJoin(dtB: this, leftFieldName: string, rightFieldName: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? [${this.Name}] 
            INNER JOIN ? [${dtB.Name}] 
            ON [${this.Name}].[${leftFieldName}] = [${dtB.Name}].[${rightFieldName}]`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    @Logger.LogFunction()
    RightJoin(dtB: this, leftFieldName: string, rightFieldName: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? [${this.Name}] 
            RIGHT JOIN ? [${dtB.Name}] 
            ON [${this.Name}].[${leftFieldName}] = [${dtB.Name}].[${rightFieldName}]`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    @Logger.LogFunction()
    FullOuterJoin(dtB: this, leftFieldName: string, rightFieldName: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? [${this.Name}] 
            FULL OUTER JOIN ? [${dtB.Name}] 
            ON [${this.Name}].[${leftFieldName}] = [${dtB.Name}].[${rightFieldName}]`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    @Logger.LogFunction()
    CrossJoin(dtB: this): this {
        this.Rows = alasql(`
            SELECT * FROM ? [${this.Name}] 
            CROSS JOIN ? [${dtB.Name}]`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    @Logger.LogFunction()
    SelectFields(fields: string[]): this {
        if (this.Rows.length === 0 || fields.length === 0)
            return this

        this.Rows = alasql(`
            SELECT [${fields.join('],[')}] 
            FROM ? [${this.Name}]`,
            [this.Rows]
        )
        return this.SetFields()
    }

    @Logger.LogFunction()
    Sort(fields: string[], orders: TSortOrder[]): this {
        this.Rows = _.orderBy(this.Rows, fields, orders)
        return this
    }

    @Logger.LogFunction()
    SetMetaData(metadata: string, value: unknown): this {
        this.MetaData[metadata] = value
        return this
    }

    @Logger.LogFunction()
    AddRows(newRows: TJson | TJson[] | undefined = undefined): this {
        if (!newRows)
            return this

        this.Rows = Array.isArray(newRows)
            ? [...this.Rows, ...newRows]
            : [...this.Rows, newRows]

        return this.SetFields()
    }

    @Logger.LogFunction()
    SyncReport(dtDestination: DataTable, on: string, flags: { keepOnlyUpdatedValues: boolean } | undefined = undefined): TSyncReport {
        const sourceHasProperty = this.Rows.some(row => on in row)

        if (!sourceHasProperty) {
            throw new HttpErrorInternalServerError(`DataTable.SyncReport: '${this.Name}' has no property '${on}'`)
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
                    // eslint-disable-next-line you-dont-need-lodash-underscore/keys
                    _.keys(updatedRow).forEach(prop => {
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

    @Logger.LogFunction()
    AnonymizeFields(fields: string | string[]): this {
        let _fields = (typeof fields === 'string')
            ? [fields]
            : fields

        if (_fields[0] == '*')
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

    //FIXME: it generates an error in case of invalid condition
    @Logger.LogFunction()
    FilterRows(condition: string | undefined): this {
        if (this.Rows.length === 0 || StringHelper.IsEmpty(condition))
            return this

        this.Rows = alasql(`
            SELECT * 
            FROM ?
            WHERE ${condition}`,
            [this.Rows]
        )
        return this
    }

    //FIXME: it generates an error in case of invalid condition
    @Logger.LogFunction()
    DeleteRows(condition: string | undefined): this {
        if (this.Rows.length === 0 || StringHelper.IsEmpty(condition))
            return this

        return this.FreeSql(`DELETE FROM [${this.Name}] WHERE ${condition}`)
    }

    @Logger.LogFunction()
    RemoveDuplicates(
        fields: string[] | undefined,
        method: string,
        strategy: string = REMOVE_DUPLICATES_STRATEGY.FIRST,
        condition: string | undefined = undefined
    ): this {

        // no fields passed
        let _fields = (fields && fields.length > 0)
            ? fields
            : undefined

        const _mapDeduplicated: Map<string, TRow> = new Map()

        this.Rows.forEach((row: TRow) => {
            let __currentHash: string = ""

            const __rowString = (_fields)
                ? _.pick(row, _fields)
                : row

            switch (method) {
                case REMOVE_DUPLICATES_METHOD.HASH:
                    __currentHash = createHash('sha256').update(JsonHelper.Stringify(__rowString)).digest('base64')
                    break
                case REMOVE_DUPLICATES_METHOD.IGNORE_CASE:
                    __currentHash = JsonHelper.Stringify(__rowString).toLowerCase()
                    break
                case REMOVE_DUPLICATES_METHOD.EXACT:
                default:
                    __currentHash = JsonHelper.Stringify(__rowString)
                    break
            }

            const __dtDuplicates = new DataTable("duplicates")

            if (_mapDeduplicated.has(__currentHash)) {
                // duplicate row
                switch (strategy) {
                    case REMOVE_DUPLICATES_STRATEGY.LAST:
                        _mapDeduplicated.set(__currentHash, row)
                        break
                    case REMOVE_DUPLICATES_STRATEGY.LOWEST:
                        _mapDeduplicated.set(
                            __currentHash,
                            <TRow>_.minBy(
                                [_mapDeduplicated.get(__currentHash), row],
                                condition
                            )
                        )
                        break
                    case REMOVE_DUPLICATES_STRATEGY.HIGHEST:
                        _mapDeduplicated.set(
                            __currentHash,
                            <TRow>_.maxBy(
                                [_mapDeduplicated.get(__currentHash), row],
                                condition
                            )
                        )
                        break
                    case REMOVE_DUPLICATES_STRATEGY.CUSTOM:
                        __dtDuplicates.AddRows([
                            <TJson>_mapDeduplicated.get(__currentHash),
                            row
                        ])

                        if (__dtDuplicates.Rows.length > 0)
                            _mapDeduplicated.set(
                                __currentHash,
                                __dtDuplicates.FilterRows(condition).Rows[0]
                            )
                        break
                    case REMOVE_DUPLICATES_STRATEGY.FIRST:
                    default:
                        break
                }

            } else {
                // new row
                _mapDeduplicated.set(__currentHash, row)
            }
        })
        // set rows
        this.Rows = Array.from(_mapDeduplicated.values())
        return this
    }
}