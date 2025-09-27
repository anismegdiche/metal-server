//
//
//
import alasql from 'alasql'
// lodash
// eslint-disable-next-line lodash/import-scope
import type { Many } from 'lodash'
import differenceBy from 'lodash/differenceBy'
import differenceWith from 'lodash/differenceWith'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import maxBy from 'lodash/maxBy'
import minBy from 'lodash/minBy'
import omit from 'lodash/omit'
import orderBy from 'lodash/orderBy'
import pick from 'lodash/pick'
import range from 'lodash/range'
import reduce from 'lodash/reduce'
import zipObject from 'lodash/zipObject'
//
import { createHash, createHmac } from 'node:crypto'
import { createIs } from 'typia'
//
import { clsClonable } from "../utils/base/clsClonable"
import { JsonUtils } from "../utils/JsonUtils"
import { Logger } from '../utils/Logger'
import { StringUtils } from "../utils/StringUtils"
import { TJson } from './TJson'


//
export const enum SORT_ORDER {
    ASC = "asc",                 // Ascending
    DESC = "desc"                // Descending
}

export const enum JOIN_TYPE {
    LEFT = "left",               // Left Join
    RIGHT = "right",             // Right Join
    INNER = "inner",             // Inner Join
    FULL_OUTER = "full-outer",   // Full Outer Join
    CROSS = "cross"              // Cross Join
}

export const enum REMOVE_DUPLICATES_METHOD {
    HASH = "hash",	             // Uses a hash function to generate unique values for each row based on specified key(s) for comparison.
    EXACT = "exact",	         // Performs an exact comparison of the specified key(s) to identify duplicates.
    IGNORE_CASE = "ignorecase"	 // Performs a case-insensitive comparison of the specified key(s) to identify duplicates.
    //   | "fuzzy"	             // Uses fuzzy matching techniques to identify duplicates based on similarity rather than exact match.
    //   | "script"	             // Executes a user-defined script to identify and handle duplicates.
    //   | "group"	             // Groups rows by specified key(s) and applies the deduplication strategy within each group.
    //   | "distinct"            // Removes duplicates by comparing all fields, not just specified key(s).
    //   | "custom"	             // Allows for a custom method defined by user logic or an external script.
}

export const enum REMOVE_DUPLICATES_STRATEGY {
    FIRST = "first",	         // Keeps the first occurrence of each duplicate row based on the specified key(s).
    LAST = "last",	             // Keeps the last occurrence of each duplicate row based on the specified key(s).
    HIGHEST = "highest",         // Keeps the duplicate row with the highest value in a specified field.
    LOWEST = "lowest",	         // Keeps the duplicate row with the lowest value in a specified field.
    CUSTOM = "custom"	         // Allows for a custom strategy defined by user logic.
}

const HASH_ALGO = 'sha256'
const HASH_DIGEST = 'base64'
const HASH_PEPPER = process.env.HASH_PEPPER || "m3t4l-m!l!t!4";

//
export type TRow = TJson
export type TFields = TJson
export type TMetaData = Record<string, unknown>
export type TOrderBy = Record<string, SORT_ORDER | undefined>
export type TSyncReport = {
    AddedRows: TRow[]
    DeletedRows: TRow[]
    UpdatedRows: TRow[]
}

function pseudonymize(value: string): string {
    return createHmac(HASH_ALGO, HASH_PEPPER)
        .update(value)
        .digest(HASH_DIGEST);
}

function anonymize(value: string): string {
    // True anonymization: irreversible and unlinkable
    // Options: random UUID, null, category, or aggregation
    return createHash(HASH_ALGO)
        .update(value + Math.random().toString()) // make it non-deterministic
        .digest(HASH_DIGEST);
}

function normalizeValue(val: unknown): string {
    if (val === null || val === undefined) return "";
    if (val instanceof Date) return val.toISOString();
    if (typeof val === "object") {
        try {
            return JSON.stringify(val);
        } catch {
            return String(val);
        }
    }
    return String(val);
}


//
export class DataTable extends clsClonable {

    // static
    static readonly DataTableType = createIs<DataTable>();

    @Logger.LogFunction(true)
    static Is(dataTable: unknown): dataTable is DataTable {
        return DataTable.DataTableType(dataTable)
    }

    // dynamic

    Name: string
    Fields: TFields = {}
    Rows: TRow[] = []
    MetaData: TMetaData = {}

    constructor(
        name?: string,
        rows?: TRow | TRow[] | TJson | TJson[],
        metaData?: TMetaData | TJson
    ) {
        super()
        this.Name = name ?? crypto.randomUUID()
        if (rows) {
            this.Set(Array.isArray(rows)
                ? rows
                : [rows])
        } else {
            this.Rows = []
        }

        this.MetaData = metaData
            ? metaData
            : {};
    }

    @Logger.LogFunction(true)
    Set(rows?: TJson[]): this {
        if (rows) {
            this.Rows = [...rows]
            this.SetFields()
        }
        return this
    }

    @Logger.LogFunction()
    Rename(name: string): this {
        this.Name = name
        return this
    }

    @Logger.LogFunction()
    SetFields(): this {
        const _cols: TJson = { ...this.Rows[0] }

        this.Fields = reduce(_cols, (result, value, key) => {
            _cols[key] = typeof (value)
            return _cols
        }, <TFields>{})
        return this
    }

    @Logger.LogFunction()
    GetFieldNames(): string[] {
        return Object.keys(this.Fields)
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

    @Logger.LogFunction(true)
    FreeSql(sqlQuery: string | undefined, jsonData?: object[]): this {
        if (sqlQuery == undefined)
            return this

        alasql.options.errorlog = true
        alasql(`CREATE TABLE IF NOT EXISTS [${this.Name}]`)
        alasql.tables[this.Name].data = this.Rows

        try {
            const _result = alasql(sqlQuery, jsonData)
            if (typeof _result === 'object' && Array.isArray(_result))
                this.Rows = _result

        } catch (error: unknown) {
            Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}'`)
            throw error
        }
        return this.SetFields()
    }

    @Logger.LogFunction(true)
    async FreeSqlAsync(sqlQuery: string | undefined, jsonData?: object[]): Promise<this> {
        if (sqlQuery == undefined)
            return this

        alasql.options.errorlog = true
        alasql(`CREATE TABLE IF NOT EXISTS [${this.Name}]`)
        alasql.tables[this.Name].data = this.Rows

        try {
            const _result = await alasql.promise(sqlQuery, jsonData)
                .then((r: unknown) => r)
                .catch((error: unknown) => {
                    Logger.Error(`DataTable.FreeSqlAsync: '${this.Name}' Error executing SQL query: '${sqlQuery}', Error: ${error}`)
                    throw error
                })

            if (typeof _result === 'object' && Array.isArray(_result))
                this.Rows = _result

        } catch (error: unknown) {
            Logger.Error(`DataTable.FreeSqlAsync: '${this.Name}' Error executing SQL query: '${sqlQuery}'`)
            throw error
        }
        return this.SetFields()
    }


    @Logger.LogFunction()
    LeftJoin(dtB: this, leftField: string, rightField: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? [${this.Name}] 
            LEFT JOIN ? [${dtB.Name}] 
            ON [${this.Name}].[${leftField}] = [${dtB.Name}].[${rightField}]`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    @Logger.LogFunction()
    InnerJoin(dtB: this, leftField: string, rightField: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? [${this.Name}] 
            INNER JOIN ? [${dtB.Name}] 
            ON [${this.Name}].[${leftField}] = [${dtB.Name}].[${rightField}]`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    @Logger.LogFunction()
    RightJoin(dtB: this, leftField: string, rightField: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? [${this.Name}] 
            RIGHT JOIN ? [${dtB.Name}] 
            ON [${this.Name}].[${leftField}] = [${dtB.Name}].[${rightField}]`,
            [this.Rows, dtB.Rows]
        )
        return this.SetFields()
    }

    @Logger.LogFunction()
    FullOuterJoin(dtB: this, leftField: string, rightField: string): this {
        this.Rows = alasql(`
            SELECT * FROM ? [${this.Name}] 
            FULL OUTER JOIN ? [${dtB.Name}] 
            ON [${this.Name}].[${leftField}] = [${dtB.Name}].[${rightField}]`,
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
    RemoveFields(fields: string[]): this {
        if (this.Rows.length === 0 || fields.length === 0)
            return this

        this.Rows = this.Rows.map((row) => omit(row, fields))
        return this.SetFields()
    }

    @Logger.LogFunction()
    Sort(sorts: TOrderBy): this {
        const fields = Object.keys(sorts)
        const orders: string[] = Object.entries(sorts).map((sort) => sort[1] ?? SORT_ORDER.ASC)
        this.Rows = orderBy(this.Rows, fields, orders as Many<boolean | "asc" | "desc"> | undefined)
        return this
    }

    @Logger.LogFunction(true)
    SetMetaData(metadata: string, value: unknown): this {
        this.MetaData[metadata] = value
        return this
    }

    @Logger.LogFunction(true)
    AddRows(newRows?: TJson | TJson[]): this {
        if (!newRows)
            return this

        this.Rows = Array.isArray(newRows)
            ? [...this.Rows, ...newRows]
            : [...this.Rows, newRows]

        return this.SetFields()
    }

    @Logger.LogFunction()
    SyncReport(dtDestination: DataTable, on: string, flags?: { keepOnlyUpdatedValues: boolean }): TSyncReport {
        const sourceHasProperty = this.Rows.some(row => on in row)

        if (!sourceHasProperty) {
            throw new Error(`DataTable.SyncReport: '${this.Name}' has no property '${on}'`)
        }

        const emptySyncReport = <TSyncReport>{
            AddedRows: <TRow[]>[],
            UpdatedRows: <TRow[]>[],
            DeletedRows: <TRow[]>[]
        }

        // Remove rows from source and destination that are equal
        const filteredSource: TRow[] = differenceWith(this.Rows, dtDestination.Rows, isEqual)
        const filteredDestination: TRow[] = differenceWith(dtDestination.Rows, this.Rows, isEqual)

        // Remove rows from destination that are not in source
        const DeletedRows: TRow[] = filteredDestination.filter(row => !filteredSource.some((srcRow: TRow) => isEqual(srcRow[on], row[on])))

        // Keep rows from source that are not in destination
        const AddedRows: TRow[] = filteredSource.filter(row => !filteredDestination.some((destRow: TRow) => isEqual(destRow[on], row[on])))

        // Keep rows from source that are in destination but have changed
        let UpdatedRows: TRow[] = differenceBy(filteredSource, AddedRows, on)

        if (DeletedRows.length == 0 && UpdatedRows.length == 0 && AddedRows.length == 0) {
            return emptySyncReport
        }

        if (flags?.keepOnlyUpdatedValues) {
            // DeletedRows = DeletedRows.map((row: TRow) => row[on]) as any []
            UpdatedRows = UpdatedRows.map(updatedRow => {
                const correspondingDestRow = filteredDestination.find(destRow => destRow[on] === updatedRow[on])
                if (correspondingDestRow) {

                    Object.keys(updatedRow).forEach(prop => {
                        if (prop !== on && isEqual(updatedRow[prop], correspondingDestRow[prop])) {
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
    async Anonymize(
        fields: string | string[],
        pseudo = true
    ): Promise<this> {
        // Normalize fields: string → split by comma, trim; array → flatten
        let _fields: string[] =
            typeof fields === "string"
                ? fields.split(",").map((f) => f.trim()).filter(Boolean)
                : fields.map((f) => f.trim());

        // Wildcard: anonymize all fields
        if (_fields.length === 1 && _fields[0] === "*") {
            _fields = this.GetFieldNames() ?? [];
        }

        const rowsPromises = this.Rows.map(async (__row, __idx) => {
            const ___newRow = { ...__row };
            await Promise.all(
                _fields.map(async (__field) => {
                    if (__field in ___newRow) {
                        const val = normalizeValue(___newRow[__field]);
                        ___newRow[__field] = pseudo ? pseudonymize(val) : anonymize(val);
                    }
                })
            );
            return { index: __idx, row: ___newRow };
        });

        const rows = await Promise.all(rowsPromises);

        this.Rows = rows.map(({ index: _index, row: _row }) => {
            this.Rows[_index] = _row;
            return _row;
        });

        return this;
    }



    @Logger.LogFunction()
    async FilterRows(condition: string | undefined): Promise<this> {
        if (this.Rows.length === 0 || StringUtils.IsEmpty(condition))
            return this

        return await this.FreeSqlAsync(`SELECT * FROM [${this.Name}] WHERE ${condition}`)
            .then((result: DataTable | undefined) => {
                if (result)
                    this.Rows = result.Rows
                return this
            })
            .catch(() => {
                Logger.Error(`DataTable.FilterRows: '${this.Name}' Error executing SQL query: '${condition}'`)
                return this
            })
    }

    @Logger.LogFunction()
    async DeleteRows(condition: string | undefined): Promise<this> {
        if (this.Rows.length === 0 || StringUtils.IsEmpty(condition))
            return this

        return await this.FreeSqlAsync(`DELETE FROM [${this.Name}] WHERE ${condition}`)
    }

    @Logger.LogFunction()
    async RemoveDuplicates(
        fields: string[] | undefined = undefined,
        method: string = REMOVE_DUPLICATES_METHOD.HASH,
        strategy: string = REMOVE_DUPLICATES_STRATEGY.FIRST,
        condition: string | undefined = undefined
    ): Promise<this> {

        // no fields passed
        const _fields = (fields && fields.length > 0)
            ? fields
            : undefined

        const _mapDeduplicated: Map<string, TRow> = new Map()

        this.Rows.forEach(async (row: TRow) => {
            let __currentHash: string = ""

            const __rowString = (_fields)
                ? pick(row, _fields)
                : row

            switch (method) {
                case REMOVE_DUPLICATES_METHOD.HASH:
                    __currentHash = createHash(HASH_ALGO).update(JsonUtils.Stringify(__rowString)).digest(HASH_DIGEST)
                    break
                case REMOVE_DUPLICATES_METHOD.IGNORE_CASE:
                    __currentHash = JsonUtils.Stringify(__rowString).toLowerCase()
                    break
                case REMOVE_DUPLICATES_METHOD.EXACT:
                default:
                    __currentHash = JsonUtils.Stringify(__rowString)
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
                            <TRow>minBy(
                                [_mapDeduplicated.get(__currentHash), row],
                                condition
                            )
                        )
                        break
                    case REMOVE_DUPLICATES_STRATEGY.HIGHEST:
                        _mapDeduplicated.set(
                            __currentHash,
                            <TRow>maxBy(
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
                                (await __dtDuplicates.FilterRows(condition)).Rows[0]
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

    @Logger.LogFunction()
    Transpose(renamedColumns?: string[]): this {
        if (isEmpty(this.Rows))
            return this

        const NAME_PATTERN = "field_"

        // Get keys from the first object
        const keys = Object.keys(this.Rows[0])

        // Determine column names
        const columns = (renamedColumns && renamedColumns.length > 0)
            ? [...renamedColumns, ...range(renamedColumns.length, keys.length).map(i => `${NAME_PATTERN}${i + 1}`)]
            : ["key", ...range(1, this.Rows.length + 1).map(i => `${NAME_PATTERN}${i}`)]

        // Transpose using lodash

        this.Rows = keys.map((key) => {
            const rowValues = [key, ...this.Rows.map((row) => row[key])]
            return zipObject(columns, rowValues)
        })
        return this
    }
}


// const SqlToJsType: TJson = {
//     // Integer (number with truncation)
//     smallint: 'number',
//     integer: 'number',
//     bigint: 'number',

//     // Decimal (number)
//     decimal: 'number',
//     numeric: 'number',

//     // Floating-Point (number)
//     real: 'number',
//     doubleprecision: 'number',

//     // Serial (number with AUTO_INCREMENT)
//     smallserial: 'number',
//     serial: 'number',
//     bigserial: 'number',

//     // Monetary (number)
//     money: 'number',

//     // Character (string)
//     charactervarying: 'string',
//     varchar: 'string',
//     nvarchar: 'string',
//     character: 'string',
//     char: 'string',
//     nchar: 'string',
//     text: 'string',

//     // Binary Data Types
//     // TBD - To Be Determined

//     // Date/Time (string and Date)
//     datestring: 'string',
//     timestring: 'string',
//     interval: 'number',
//     dateobject: 'date',

//     // Boolean (boolean)
//     boolean: 'boolean',

//     // Complex data types
//     // Enumeration (array of strings or numbers)
//     enum: 'enum',

//     // Geometric Types
//     // Not realized

//     // Network Address Types
//     // Not realized

//     // Bit String
//     // Not realized

//     // Text Search
//     // Not realized

//     // UUID (string)
//     uuid: 'string',

//     // XML (object with special structure)
//     xml: 'object',
//     html: 'object',

//     // JSON (object)
//     json: 'object',
//     jsonb: 'object',

//     // Array (object)
//     array: 'object',

//     // Composite (object)
//     composite: 'object',

//     // Range (object)
//     // Not yet realized

//     // OID
//     // Not realized yet

//     // Graph data types
//     // Class (realized with tables)
//     class: 'object',

//     // Object (object)
//     object: 'object'

//     // Document (object)
//     // TBD - To Be Determined

//     // Object reference (number or string)
//     // TBD - To Be Determined

//     // Domain
//     // TBD - To Be Determined

//     // Pseudo
//     // Not yet realized
// }