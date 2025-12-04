/* eslint-disable security/detect-object-injection */

//
//
//
import { DuckDBConnection, DuckDBInstance, DuckDBValue } from '@duckdb/node-api'
import fs from 'node:fs'
import { createIs } from 'typia'
import { UUID } from 'uuidv7'
//
import { Assert } from '../utils/Assert'
import { clsClonable } from "../utils/base/clsClonable"
import { JsonUtils } from "../utils/JsonUtils"
import { Logger } from '../utils/Logger'
import { Mutex } from '../utils/Mutex'
import { SQL_TYPE, SqlQueryUtils, TSqlToken } from '../utils/SqlQueryUtils'
import { StringUtils } from "../utils/StringUtils"
import { TypeUtils } from '../utils/TypeUtils'
import { Utils } from '../utils/Utils'
import { TAny } from './TAny'
import { TJson } from './TJson'

//
export const enum SORT_ORDER {
    ASC = "asc",
    DESC = "desc"
}

export const DATATABLE_SYS_FIELDS = [
    "__seq__",
    "__idx__",
    "__data__",
    "created_at"
]

//
export type TRow = TJson & {
    __seq__?: number
    __idx__?: UUID
}
export type TFields = TJson
export type TMetaData = Record<string, unknown>
export type TOrderBy = Record<string, SORT_ORDER | undefined>
type TStats = {
    row_count: number
    field_count: number
}
type TRowsParams = {
    includeIndex?: boolean
    fields?: string[]
    filter?: string | TJson
    skip?: number
    limit?: number
    sort?: string | TOrderBy | null
    fnMap?: (row: TRow) => TRow
    fnFilter?: (row: TRow) => boolean | Promise<boolean>
    abortSignal?: AbortSignal
}

type TRowsIteratorParams = Pick<TRowsParams, 'includeIndex' | 'fields' | 'filter' | 'fnMap' | 'fnFilter' | 'abortSignal'> & {
    batchSize?: number
}

type TRowsConstructSqlParams = Pick<TRowsParams, 'includeIndex' | 'fields' | 'filter' | 'skip' | 'limit' | 'sort'> & {
    safeName: string
}
type TRowsRunParams = Pick<TRowsParams, 'includeIndex' | 'fields' | 'fnMap'>

type TRowsParseParams = TRowsRunParams & {
    row: Record<string, DuckDBValue> | TRow
}

export type TRowsCopyParams = Pick<TRowsParams, 'fields' | 'filter' | 'skip' | 'limit' | 'sort' | 'fnMap' | 'fnFilter'>

function duckDb_Sql_SafeName(table: string): string {
    return `"${table}"`
}

function duckDb_Sql_SafeSeqName(table: string): string {
    return `seq_${table.replace(/[^a-zA-Z0-9_]/g, '_')}`
}

export function duckDb_Sql_CreateTable(table: string): string {
    return `
    CREATE SEQUENCE IF NOT EXISTS ${duckDb_Sql_SafeSeqName(table)} START 1;

    CREATE TABLE IF NOT EXISTS ${duckDb_Sql_SafeName(table)} (
        __seq__     INTEGER     PRIMARY KEY DEFAULT nextval('${duckDb_Sql_SafeSeqName(table)}'),
        __idx__     TEXT        DEFAULT uuidv7(),
        __data__    JSON,
        created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );
    `
}

export function duckDb_Sql_DropTable(table: string): string {
    return `DROP TABLE IF EXISTS ${duckDb_Sql_SafeName(table)};`
}

export function duckDb_Sql_RenameTable(oldTable: string, newTable: string): string {
    return `ALTER TABLE ${duckDb_Sql_SafeName(oldTable)} RENAME TO ${duckDb_Sql_SafeName(newTable)};`
}

export function dataTable_fieldIsSystem(field?: string): boolean {
    if (!field)
        return false
    return DATATABLE_SYS_FIELDS.includes(field)
}

function dataTable_constructSql(
    {
        includeIndex,
        filter,
        limit,
        skip,
        sort = '__seq__',
        safeName
    }: TRowsConstructSqlParams
): string {

    const sqlIndex = includeIndex
        ? '__idx__,'
        : ''

    let sqlWhere = 'WHERE 1=1'

    if (filter) {
        const _filter = typeof filter === 'string'
            ? filter
            : JsonUtils.Join(filter, ' = ', ' AND ')

        sqlWhere = `WHERE ${dataTable_convertSql(_filter)}`
    }

    let sqlOrderBy = ''

    if (sort && sort !== null) {
        const _sort = typeof sort === 'string'
            ? sort
            : JsonUtils.Join(sort, ' ', ', ')

        sqlOrderBy = `ORDER BY ${dataTable_convertSql(_sort)}`
    }

    const sqlOffset = skip
        ? `OFFSET ${skip}`
        : ''

    const sqlLimit = limit
        ? `LIMIT ${limit}`
        : ''

    const sql = `
            SELECT
                __seq__,
                ${sqlIndex}
                __data__,
                created_at
            FROM
                ${safeName}
            ${sqlWhere}
            ${sqlOrderBy}
            ${sqlOffset}
            ${sqlLimit}
            `

    return sql
}

export function dataTable_convertSql(sql?: string): string {
    if (!sql)
        return ''

    const sqlQuery = new SqlQueryUtils(sql)
    const tokens = sqlQuery.Tokenize()
    let precedToken: TSqlToken | undefined = undefined

    tokens.map(token => {
        switch (true) {
            case token.type === SQL_TYPE.VARIABLE
                && !dataTable_fieldIsSystem(token.token)
                && !['FROM', 'INTO', 'SET'].includes(token.context):
                token.token = `(__data__->'${token.token.replace(/"/g, '')}')`
                break

            case token.type === SQL_TYPE.STRING
                && token.token.startsWith("'")
                && token.token.endsWith("'")
                && token.context === 'WHERE'
                && precedToken?.token !== 'LIKE':
                token.token = `'"${token.token.slice(1, -1)}"'`
                break
            case token.type === SQL_TYPE.FIELD
                && !dataTable_fieldIsSystem(token.token)
                && token.context === 'SELECT':
                token.token = `(__data__->'${token.token.replace(/"/g, '')}') AS ${token.token}`
                break
            default:
                break
        }
        precedToken = token
        return token
    })

    let setToken: string = '__data__ = json_merge_patch(__data__, json_object('
    tokens.filter((token) => {
        if (token.context === 'SET') {
            switch (true) {
                case token.type === SQL_TYPE.COMMAND:
                    break
                case token.type === SQL_TYPE.OPERATOR && token.token === '=':
                    setToken += ','
                    break
                case token.token === "?":
                    setToken += token.token
                    break
                case token.type === SQL_TYPE.VARIABLE:
                    setToken += `'${token.token.replace(/"/g, '')}'`
                    break
                default:
                    setToken += token.token
                    break
            }
        }
    })
    setToken += '))'

    const finalTokens: TSqlToken[] = []
    let firstSetEncountered = false

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        if (token.context === 'SET' && token.type !== SQL_TYPE.COMMAND) {
            if (!firstSetEncountered) {
                finalTokens.push({ token: setToken, type: SQL_TYPE.FUNCTION, context: 'SET' })
                firstSetEncountered = true
            }
            // Skip other tokens within the SET context
        } else {
            finalTokens.push(token)
        }
    }
    const query = finalTokens.map(token => token.token).join(' ')

    return query
}

function duckDb_row_parser(
    {
        includeIndex,
        fields,
        row,
        fnMap
    }: TRowsParseParams
): TRow {
    const jsonRaw = row.__data__ as string
    let _row: TRow = {}

    if (StringUtils.IsEmpty(jsonRaw))
        return <TRow>{}

    const __data__Parsed = JsonUtils.TryParse(jsonRaw, <TRow>{})
    if (!__data__Parsed)
        return <TRow>{}

    const _fields = fields?.includes('*')
        ? undefined
        : fields

    let selectedFields = _fields
    if (!selectedFields || selectedFields.length === 0)
        selectedFields = Object.keys(__data__Parsed)

    for (const k of selectedFields) {
        if (!dataTable_fieldIsSystem(k)) {
            _row[k] = __data__Parsed[k]
        }
    }

    if (row.__idx__ && includeIndex)
        _row.__idx__ = row.__idx__ as UUID

    // Apply mapping if specified
    if (fnMap)
        _row = fnMap(_row)

    return _row
}

//
// LazyResult (cursor-based chunked streaming)
//
class LazyResult<T> {
    private batchSize: number
    private cache = new Map<number, T>()
    private totalCount: number | null = null
    private lastSeq: number | null = null
    private done = false
    private cacheSize: number

    constructor(
        private _duckConnection: DuckDBConnection,
        private sqlQuery: string, // "SELECT __seq__, __idx__, __data__, created_at FROM <table> WHERE 1=1"
        private queryParams: (string | number | boolean | null)[] = [],
        private fnParser: (row: Record<string, DuckDBValue>) => T,
        batchSize: number = 100,
        cacheSize: number = 1000
    ) {
        this.batchSize = batchSize
        this.cacheSize = cacheSize
    }

    private async _fetchNextChunk(): Promise<T[]> {
        const queryParams = [...this.queryParams]
        let fullQuery: string

        const sqlLimit = (this.batchSize > 0)
            ? `LIMIT ${this.batchSize}`
            : ''

        if (this.lastSeq === null) {
            fullQuery = `${this.sqlQuery} ORDER BY __seq__ ${sqlLimit}`
        } else {
            fullQuery = `${this.sqlQuery} AND __seq__ > ? ORDER BY __seq__ ${sqlLimit}`
            queryParams.push(String(this.lastSeq))
        }

        const reader = await this._duckConnection.streamAndReadAll(fullQuery, queryParams)
        const rows = reader.getRowObjects()
        if (!rows || rows.length === 0) {
            this.done = true
            return []
        }

        const lastRowSeq = rows[rows.length - 1].__seq__
        this.lastSeq = typeof lastRowSeq === 'number'
            ? lastRowSeq
            : (typeof lastRowSeq === 'string'
                ? Number(lastRowSeq)
                : null)

        return rows.map(this.fnParser)
    }

    private async _ensureLoaded(index: number): Promise<T | undefined> {
        if (this.cache.has(index))
            return this.cache.get(index)

        let currentIndex = this.cache.size > 0
            ? Math.max(-1, ...Array.from(this.cache.keys())) + 1
            : 0

        while (currentIndex <= index && !this.done) {
            const chunk = await this._fetchNextChunk()
            chunk.forEach((item, i) => {
                const globalIndex = currentIndex + i
                if (this.cache.size >= this.cacheSize) {
                    const oldest = this.cache.keys().next().value
                    if (oldest !== undefined)
                        this.cache.delete(oldest)
                }
                this.cache.set(globalIndex, item)
            })
            if (chunk.length === 0)
                break
            currentIndex += chunk.length
        }

        return this.cache.get(index)
    }

    async get(index: number): Promise<T | undefined> {
        return this._ensureLoaded(index)
    }

    async length(): Promise<number> {
        if (this.totalCount !== null)
            return this.totalCount

        const countQuery = this.sqlQuery
            .replace(/ORDER BY.*/i, '')
            .replace(/LIMIT.*/i, '')

        const wrapped = `SELECT COUNT(*) as count FROM (${countQuery})`
        const reader = await this._duckConnection.runAndReadAll(wrapped, this.queryParams)
        const rows = reader.getRowObjects()
        this.totalCount = Number(rows[0]?.count ?? 0)
        return this.totalCount
    }

    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
        this.lastSeq = null
        this.done = false
        while (!this.done) {
            const chunk = await this._fetchNextChunk()
            for (const item of chunk) yield item
            if (chunk.length < this.batchSize) this.done = true
        }
    }

    async forEach(callback: (item: T, index: number) => void | Promise<void>): Promise<void> {
        let idx = 0
        for await (const item of this) {
            await callback(item, idx++)
        }
    }

    async map<U>(callback: (item: T, index: number) => U | Promise<U>): Promise<U[]> {
        const out: U[] = []
        let idx = 0
        for await (const item of this)
            out.push(await callback(item, idx++))
        return out
    }

    async filter(callback: (item: T, index: number) => boolean | Promise<boolean>): Promise<T[]> {
        const out: T[] = []
        let idx = 0
        for await (const item of this) {
            if (await callback(item, idx++))
                out.push(item)
        }
        return out
    }

    async toArray(): Promise<T[]> {
        const out: T[] = []
        for await (const item of this)
            out.push(item)
        return out
    }

    async slice(start: number, end?: number): Promise<T[]> {
        const out: T[] = []
        let idx = 0
        for await (const item of this) {
            if (idx >= start && (end === undefined || idx < end))
                out.push(item)
            idx++
            if (end !== undefined && idx >= end)
                break
        }
        return out
    }

    clearCache(): void {
        this.cache.clear()
    }
}

export class DataTable extends clsClonable {
    // static
    static readonly DataTableType = createIs<DataTable>();

    @Logger.LogFunction(true)
    static Is(dataTable: unknown): dataTable is DataTable {
        return DataTable.DataTableType(dataTable)
    }

    Name: string
    MetaData: TMetaData = {}
    BatchSize: number

    private _fields: TFields = {}
    private _duckInstance?: DuckDBInstance
    _duckConnection?: DuckDBConnection
    private _tableInitialized: boolean = false
    private _dbPath?: string
    private _persistent?: boolean
    private _writeLock: Promise<void> = Promise.resolve();
    private _lock: Mutex = new Mutex()
    private _rows?: TRow[]
    private _isAttached: boolean = false

    constructor(
        name?: string,
        rows?: TRow | TRow[] | TJson | TJson[],
        metaData?: TMetaData | TJson,
        opt: {
            persistant?: boolean,
            batchSize?: number,
            duckInstance?: DuckDBInstance
        } = {}) {
        super()
        this.Name = name ?? Utils.Uuid(true)
        this.MetaData = metaData ?? this.MetaData
        this.BatchSize = opt.batchSize ?? 100

        if (opt.duckInstance) {
            this._duckInstance = opt.duckInstance
            this._isAttached = true
        } else {
            this._dbPath = StringUtils.Path('./tmp', `${this.Name}_${Utils.Uuid(true)}.db`)
            this._persistent = opt.persistant ?? false
        }

        // If initial rows provided, persist them during lazy init later
        if (rows) {
            this._rows = Array.isArray(rows)
                ? rows
                : [rows]
        }

    }

    [Symbol.dispose](): void {
        this.MetaData = {}

        if (this._isAttached) {
            this._duckConnection!.run(duckDb_Sql_DropTable(this.Name))
            return
        }
        // close duckdb resources if any
        if (this._duckConnection) {
            try {
                this._duckConnection.closeSync()
            } catch {
                Logger.Error('Error closing DuckDB connection')
            }
            this._duckConnection = undefined
        }
        if (this._duckInstance) {
            try {
                this._duckInstance.closeSync()
            } catch {
                Logger.Error('Error closing DuckDB connection')
            }
            this._duckInstance = undefined
        }
        if (this._persistent && this._dbPath) {
            try {
                fs.rmSync(this._dbPath, { recursive: true, force: true })
            } catch {
                Logger.Error('Error removing DuckDB database')
            }
        }
    }

    Dispose(): void {
        this[Symbol.dispose]()
    }

    get SafeName(): string {
        return duckDb_Sql_SafeName(this.Name)
    }

    @Logger.LogFunction()
    get Fields(): TFields {
        return this._fields
    }

    // Lazy DB init
    async _dbEnsureInitialized(): Promise<void> {
        if (this._tableInitialized)
            return

        if (!this._duckInstance) {
            const uri = this._persistent
                ? this._dbPath
                : ':memory:'

            this._duckInstance = await DuckDBInstance.create(uri)
        }
        if (!this._duckConnection) {
            this._duckConnection = await this._duckInstance.connect()
        }

        const cnx = this._duckConnection
        await this._lock.Acquire()
        {
            // create table
            await cnx.run(duckDb_Sql_DropTable(this.Name))
            await cnx.run(duckDb_Sql_CreateTable(this.Name))

            this._tableInitialized = true

            // persist initial rows if any
            if (this._rows && this._rows.length > 0) {
                await this._dbPersistRows(this._rows)
                this._rows = undefined
            }
        }
        this._lock.Release()
    }

    // Persist rows to DB (transactional)
    /**
     * Serializes writes so that BEGIN/COMMIT transactions never overlap.
     * Accepts an array of rows, persists them in a single transaction (if possible).
     */
    private async _dbPersistRows(rows: TJson[] | TRow[]): Promise<void> {
        // enqueue the actual work on the write lock
        const work = async () => {
            await this._dbEnsureInitialized()
            const cnx = this._duckConnection!

            // Try to run in a single transaction for speed and atomicity.
            // Because writes are serialized by the write-lock, no nested-BEGIN should occur.
            try {
                await cnx.run('BEGIN')
            } catch (beginErr) {
                // If BEGIN failed because a transaction is already open, log and continue without explicit BEGIN.
                // With the write-lock we shouldn't normally hit this; keep this fallback.
                Logger.Error(`_persistRowsToDb: BEGIN failed (continuing without explicit transaction): ${(beginErr as Error).message}`)
            }

            try {
                for (const row of rows) {
                    const __data__ = JsonUtils.Stringify(row)
                    try {
                        // Prefer sequence-based insert (if sequence available)
                        await cnx.runAndReadAll(
                            `INSERT INTO ${this.SafeName}
                                (__data__)
                             VALUES
                                (?)
                             RETURNING __seq__`,
                            [__data__]
                        )
                    } catch {
                        // Fallback if sequence not supported or insertWithSeq failed: compute max(__seq__)+1
                        const r2 = await cnx.runAndReadAll(
                            `SELECT MAX(__seq__) as maxSeq
                            FROM ${this.SafeName}`
                            , [])
                        const maxSeq = Number(r2.getRowObjects()[0]?.maxSeq ?? 0)
                        const newSeq = maxSeq + 1
                        await cnx.run(
                            `INSERT INTO ${this.SafeName}
                                (__seq__, __data__)
                             VALUES
                                (?, ?)`,
                            [newSeq, __data__]
                        )
                    }
                }

                // Commit if we successfully began a transaction.
                try {
                    await cnx.run('COMMIT')
                } catch (commitErr) {
                    // If commit fails because there was no transaction, ignore (we may have been running without BEGIN)
                    Logger.Error(`_persistRowsToDb: COMMIT failed (possibly no active transaction): ${(commitErr as Error).message}`)
                }
            } catch (err) {
                // Attempt rollback if possible
                try {
                    await cnx.run('ROLLBACK')
                } catch (rbErr) {
                    // swallow rollback error but log it
                    Logger.Error(`_persistRowsToDb: ROLLBACK failed: ${(rbErr as Error).message}`)
                }
                throw err
            }
        }

        // Chain the work onto the write-lock so writes run sequentially.
        // Preserve any thrown error to the caller.
        const prevLock = this._writeLock
        let release!: () => void
        // Create a new promise to become the next lock
        const nextLock = new Promise<void>(res => { release = res })
        this._writeLock = (async () => {
            // wait previous work to finish
            await prevLock
            try {
                await work()
            } finally {
                // release the lock for the next queued task
                release()
            }
        })()

        // Wait for our enqueued work to finish before returning to caller.
        // This ensures SetRows waits for persistence (you can change to fire-and-forget if desired).
        await this._writeLock
    }

    // fetch rows from DB and parse __data__ to objects
    async _runSqlAndGetRows(
        sqlQuery: string,
        queryParams?: TAny[],
        {
            includeIndex = false,
            fields,
            fnMap
        }: TRowsRunParams = {}
    ): Promise<TRow[]> {
        await this._dbEnsureInitialized()
        const cnx = this._duckConnection!

        const reader = await cnx.runAndReadAll(sqlQuery, queryParams as DuckDBValue[])
        const __data__ = reader.getRowObjects()

        return __data__
            .map(row => duckDb_row_parser({ row, fields, includeIndex, fnMap }))
    }

    private _getFieldsFromRows(rows: TRow[] | TJson[]): TFields {
        const first = rows[0] ?? {}
        const entries = Object.entries(first)
        const safeFields = entries.reduce((acc: TFields, [key, value]) => {
            if (dataTable_fieldIsSystem(key))
                return acc

            return {
                ...acc,
                [key]: TypeUtils.GetType(value)
            }
        }, {} as TFields)
        return safeFields
    }

    @Logger.LogFunction()
    Rename(name: string): this {
        this.Name = name
        return this
    }

    BatchSizeSet(batchSize: number) {
        Assert.Condition(batchSize >= 0, "batchSize must be greater than or equal to 0")
        this.BatchSize = batchSize
    }

    async Copy(name?: string,
        {
            fields,
            filter,
            skip,
            limit,
            sort,
            fnMap,
            fnFilter
        }: TRowsCopyParams = {}): Promise<DataTable> {
        return new DataTable(
            name ?? this.Name,
            await this.Rows({
                fields,
                filter,
                skip,
                limit,
                sort,
                fnMap,
                fnFilter
            }))
    }

    @Logger.LogFunction()
    async Stats(): Promise<TStats> {
        await this._dbEnsureInitialized()
        const cnx = this._duckConnection!
        const sql = `
            SELECT
                estimated_size,
                column_count
            FROM
                duckdb_tables()
            WHERE
                table_name = '${this.SafeName.replace(/"/g, '')}'
            `
        const reader = await cnx.runAndReadAll(sql)
        const stats = reader.getRowObjects()[0]
        await this.FieldsSet()
        return <TStats>{
            row_count: Number(stats.estimated_size),
            field_count: Number(stats.column_count)
        }
    }

    @Logger.LogFunction()
    async Count(): Promise<number> {
        return this.Stats()
            .then(stats => stats.row_count)
    }

    @Logger.LogFunction(true)
    MetaDataSet(metadata: string, value: unknown): this {
        this.MetaData[metadata] = value
        return this
    }

    @Logger.LogFunction()
    GetFieldsName(): string[] {
        return Object.keys(this.Fields)
    }

    @Logger.LogFunction()
    async FieldsSet(fields?: TFields): Promise<this> {
        if (fields) {
            this._fields = fields
            return this
        }
        const first = await this.Rows({ limit: 1 })
        this._fields = this._getFieldsFromRows(first)
        return this
    }

    async Row(rowIndex: number): Promise<TRow> {
        return this.Rows({ limit: 1, skip: rowIndex })
            .then(rows => rows.at(0) as TRow)
            .catch(() => {
                throw new Error(`Row ${rowIndex} not found`)
            })
    }

    @Logger.LogFunction(true)
    async Rows(
        {
            includeIndex = false,
            fields,
            filter,
            skip,
            limit,
            sort,
            fnMap,
            fnFilter
        }: TRowsParams = {}
    ): Promise<TRow[]> {
        await this._dbEnsureInitialized()

        const sql = dataTable_constructSql({
            includeIndex,
            fields,
            filter,
            skip,
            limit,
            sort,
            safeName: this.SafeName
        })

        const rows = await this._runSqlAndGetRows(sql, undefined, {
            includeIndex,
            fields,
            fnMap
        })

        if (fnFilter)
            return rows.filter(row => fnFilter(row))

        return rows
    }

    /**
     * Streaming async iterator (lazy) over DB rows.
     */
    @Logger.LogFunction(true)
    async RowsIterator({
        includeIndex = false,
        fields,
        filter,
        fnMap,
        fnFilter,
        batchSize = this.BatchSize,
        abortSignal
    }: TRowsIteratorParams
    ): Promise<AsyncIterableIterator<TRow>> {
        Assert.Condition(batchSize >= 0, "batchSize must be greater than or equal to 0")

        // Build base query with SQL filtering if provided
        const sql = dataTable_constructSql({
            includeIndex,
            fields,
            filter,
            skip: undefined,
            limit: undefined,
            sort: null, //WORKAROUND undefined
            safeName: this.SafeName
        })

        await this._dbEnsureInitialized();
        const lazy = new LazyResult<TRow>(
            this._duckConnection!,
            sql,
            [],
            (row: Record<string, DuckDBValue>) => duckDb_row_parser({ row, fields, includeIndex, fnMap }),
            batchSize
        );

        // If fnFilter is provided, wrap the iterator with the filter
        if (fnFilter) {
            return (async function* () {
                for await (const r of lazy) {
                    if (await fnFilter(r)) yield r;
                }
            })();
        }

        return lazy[Symbol.asyncIterator]();
    }

    @Logger.LogFunction(true)
    async RowsSet(rowOrRows?: TJson | TRow | TJson[] | TRow[]): Promise<this> {
        if (rowOrRows === undefined && this._rows === undefined)
            return this

        const __data__ = rowOrRows
            ? Array.isArray(rowOrRows)
                ? rowOrRows
                : [rowOrRows]
            : this._rows ?? []

        await this._dbEnsureInitialized()
        await this.RowsDelete()
        await this._dbPersistRows(__data__)

        return this.FieldsSet()
    }

    @Logger.LogFunction()
    async RowsAdd(newRowOrRows?: TJson | TRow | TJson[] | TRow[]): Promise<this> {
        if (!newRowOrRows)
            return this

        const rows = Array.isArray(newRowOrRows)
            ? newRowOrRows
            : [newRowOrRows]

        await this._dbEnsureInitialized()
        await this._dbPersistRows(rows)
        // update fields based on first row if empty or union fields
        return this.FieldsSet()
    }

    @Logger.LogFunction()
    async RowsDelete(condition?: string): Promise<this> {
        await this._dbEnsureInitialized()
        const cnx = this._duckConnection!

        const _condition = StringUtils.IsEmpty(condition)
            ? ''
            : `WHERE ${dataTable_convertSql(condition)}`

        return cnx.run(`DELETE FROM ${this.SafeName} ${_condition}`)
            .then(() => this._rows = undefined)
            .then(() => this._fields = {})
            .then(() => this.FieldsSet())
            .catch((error) => {
                Logger.Error(`Failed to delete from '${this.SafeName}': ${JsonUtils.Stringify(error)}`)
                throw error
            })
    }

    @Logger.LogFunction(true)
    async RowsUpdate(row: TJson | TRow, condition?: string): Promise<this> {
        await this._dbEnsureInitialized()
        const cnx = this._duckConnection!
        const __data__ = JsonUtils.Stringify(row)

        const _condition = condition
            ? `WHERE ${dataTable_convertSql(condition)}`
            : ''

        await cnx.run(`
            UPDATE ${this.SafeName}
            SET __data__ = ?
            ${_condition}`,
            [__data__]
        )
        return this.FieldsSet()
    }

    @Logger.LogFunction(true)
    async RowUpdateByIndex(index?: UUID, row?: TJson | TRow): Promise<this> {
        if (!index || !row)
            return this

        await this._dbEnsureInitialized()
        const cnx = this._duckConnection!
        const __data__ = JsonUtils.Stringify(row)

        await cnx.run(`
            UPDATE ${this.SafeName}
            SET __data__ = ?
            WHERE __idx__ = ?`,
            [__data__, index]
        )
        return this.FieldsSet()
    }

    @Logger.LogFunction(true)
    async RowsMap(fnMap: (row: Partial<TRow>) => Promise<TRow>, condition?: string): Promise<this> {
        await this._dbEnsureInitialized()

        const iterator = await this.RowsIterator({
            includeIndex: true, // We need the index to update specific rows
            filter: condition,
        })

        const updatePromises: Promise<this>[] = []
        for await (const row of iterator) {
            const updatedRow = await Promise.resolve(fnMap(row))
            if (updatedRow.__idx__) {
                updatePromises.push(this.RowUpdateByIndex(updatedRow.__idx__, updatedRow))
            } else {
                Logger.Warn(`DataTable.RowsMap: Row missing __idx__ for update, skipping. Row: ${JSON.stringify(row)}`)
            }
        }

        await Promise.all(updatePromises)

        // Refresh fields in case the mapping changed the structure of rows
        return this.FieldsSet()
    }

    @Logger.LogFunction(true)
    async FreeSql(
        {
            sqlQuery,
            queryParams,
            returnData = false,
            convertCondition = true
        }: {
            sqlQuery?: string,
            queryParams?: TAny[],
            returnData?: boolean,
            convertCondition?: boolean
        } = {}): Promise<DataTable | this> {
        if (!sqlQuery)
            return this

        await this._dbEnsureInitialized()
        const cnx = this._duckConnection!

        const _sql = convertCondition
            ? dataTable_convertSql(sqlQuery)
            : sqlQuery

        if (returnData) {
            const result = new DataTable(
                this.Name,
                await this._runSqlAndGetRows(_sql, queryParams)
                    .catch((err) => {
                        Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
                        throw new Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
                    })
            )
            return result.FieldsSet()
        }

        await cnx.run(_sql, queryParams as DuckDBValue[])
            .catch((err) => {
                Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
                throw new Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
            })

        return this.FieldsSet()
    }

    @Logger.LogFunction()
    async Sort(sorts: TOrderBy): Promise<this> {
        if (Object.keys(sorts).length === 0) return this

        const sqlOrderBy = Object.entries(sorts)
            .map(([field, order]) => {
                // Extract field value from JSON data to a typed column
                const col = `"${field}"`
                return `${col} ${order ?? SORT_ORDER.ASC}`
            })
            .join(', ')

        const sqlSort = Object.keys(sorts)
            .map(field => `(__data__->'${field}') as "${field}"`)
            .join(',\n        ')

        const sql = `
            WITH data_view AS (
                SELECT
                    __idx__,
                    __data__,
                    ${sqlSort}
                FROM
                    ${this.SafeName}
            ),
            ranked AS (
                SELECT
                    __idx__,
                    ROW_NUMBER() OVER (
                        ORDER BY ${sqlOrderBy}
                    ) AS new_seq
                FROM
                    data_view
            )
            UPDATE
                ${this.SafeName} AS t
            SET
                __seq__ = r.new_seq
            FROM
                ranked r
            WHERE
                t.__idx__ = r.__idx__;
            `

        await this._runSqlAndGetRows(sql)
        return this
    }

    async Pick(fields: string[]): Promise<this> {
        if (!fields || fields.length === 0)
            return this;

        const sqlSet = fields.map(f => `'${f}', (__data__->'${f}')`).join(', ')

        const sql = `
            UPDATE 
                ${this.SafeName}
            SET 
                __data__ = json_object(${sqlSet})                
        `

        await this.FreeSql({ sqlQuery: sql, convertCondition: false })
        return this.FieldsSet()
    }

    async Omit(fields: string[]): Promise<this> {
        if (!fields || fields.length === 0)
            return this;

        const excludeClause = fields.map(f => `'${f}'`).join(', ');

        const sql = `
            UPDATE ${this.SafeName}
            SET __data__ = (
                SELECT to_json(
                    map_from_entries(
                        list_zip(
                            list_filter(json_keys(__data__), k -> k NOT IN (${excludeClause})),
                            list_transform(
                                list_filter(json_keys(__data__), k -> k NOT IN (${excludeClause})),
                                k -> json_extract(__data__, '$.' || k)
                            )
                        )
                    )
                )
            );
        `;

        await this.FreeSql({ sqlQuery: sql, convertCondition: false });
        return this.FieldsSet()
    }

    async Map(fnMap: (row: TRow) => TRow): Promise<this> {
        const iterator = await this.RowsIterator({ includeIndex: true });
        const updatePromises: Promise<this>[] = [];

        for await (const row of iterator) {
            const __idx__ = row.__idx__;
            const newData = fnMap(row);
            updatePromises.push(this.RowUpdateByIndex(__idx__, newData));
        }

        return Promise.all(updatePromises)
            .then(() => this.FieldsSet())
            .catch((error) => {
                Logger.Error(`Failed to update rows in '${this.SafeName}': ${JsonUtils.Stringify(error)}`)
                throw error
            })
    }
}