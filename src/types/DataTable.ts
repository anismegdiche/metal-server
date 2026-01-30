/* eslint-disable security/detect-object-injection */

//
//
//
import type { DuckDBValue } from '@duckdb/node-api';
import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import fs from 'node:fs';
import { cpus } from 'node:os';
import { z } from "zod";
//

import { SERVER } from '../modules/core/@consts';
import { Assert } from '../utils/Assert';
import { clsClonable } from "../utils/base/clsClonable";
import { JsonUtils } from "../utils/JsonUtils";
import { Logger } from '../utils/Logger';
import { Mutex } from '../utils/Mutex';
import type { TSqlToken } from '../utils/SqlQueryUtils';
import { SQL_TYPE, SqlQueryUtils } from '../utils/SqlQueryUtils';
import { StringUtils } from "../utils/StringUtils";
import { TypeUtils } from '../utils/TypeUtils';
import { Utils } from '../utils/Utils';
import type { TAny } from './TAny';
import { z_TJson, type TJson } from './TJson';
import { z_TUuidv7, type TUuidv7 } from './TUuidv7';
import { z_T_IntPositive } from './T_IntPositive';


// constants
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

export const DATATABLE_TEMP_PATH = StringUtils.Path(SERVER.TEMP_PATH, 'data')


// schemas
export const z_SORT_ORDER = z.enum(["asc", "desc"]);// TOrderBy

export const z_TOrderBy = z.record(
    z.string(),
    z_SORT_ORDER.optional()
);

const z_TRow = z_TJson.and(
    z.object({
        __seq__: z_T_IntPositive.optional(),
        __idx__: z_TUuidv7.optional(),
    })
);


// types
export type TRow = z.infer<typeof z_TRow>
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


//
function duckDb_Sql_SafeName(table: string): string {
    return `"${table}"`
}

function duckDb_Sql_SafeSeqName(table: string): string {
    return `seq_${table.replaceAll(/[^a-zA-Z0-9_]/g, '_')}`
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
            : Object.entries(filter).map(([key, value]) => {
                return `${key} = '${value}'`
            }).join(' AND ')

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
                token.token = `(__data__->'${token.token.replaceAll(/"/g, '')}')`
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
                token.token = `(__data__->'${token.token.replaceAll(/"/g, '')}') AS ${token.token}`
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
                    setToken += `'${token.token.replaceAll(/"/g, '')}'`
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

        Assert.Var<TSqlToken>(token, 'token is undefined')

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
        _row.__idx__ = <TUuidv7>row.__idx__

    // Apply mapping if specified
    if (fnMap)
        _row = fnMap(_row)

    return _row
}

//
// LazyResult - Memory-efficient streaming iterator for DuckDB
//
class LazyResult<T> {
    private batchSize: number
    private cacheSize: number
    private offset: number = 0
    private done: boolean = false
    private cache = new Map<number, T>()
    private totalCount: number | null = null

    constructor(
        private _duckConnection: DuckDBConnection,
        private baseQuery: string,  // Query WITHOUT LIMIT/OFFSET
        private queryParams: DuckDBValue[] = [],
        private fnParser: (row: Record<string, DuckDBValue>) => T,
        batchSize: number = 100,
        cacheSize: number = 1000
    ) {
        this.batchSize = Math.max(1, batchSize)
        this.cacheSize = cacheSize
    }

    private async _fetchBatch(): Promise<T[]> {
        // Clean up query - remove any existing LIMIT/OFFSET
        const cleanQuery = this.baseQuery
            .trim()
            .replaceAll(/LIMIT\s+\d+\s*/gi, '')
            .replaceAll(/OFFSET\s+\d+\s*/gi, '')

        const query = `${cleanQuery} LIMIT ${this.batchSize} OFFSET ${this.offset}`

        try {
            const reader = await this._duckConnection.runAndReadAll(
                query,
                this.queryParams
            )
            const rows = reader.getRowObjects()

            if (!rows || rows.length === 0) {
                this.done = true
                return []
            }

            // If we got fewer rows than batch size, we're at the end
            if (rows.length < this.batchSize) {
                this.done = true
            }

            this.offset += rows.length

            return rows.map(row => this.fnParser(row))
        } catch (err) {
            Logger.Error(`LazyResult._fetchBatch: Error fetching batch at offset ${this.offset}: ${(err as Error).message}`)
            this.done = true
            return []
        }
    }

    async length(): Promise<number> {
        if (this.totalCount !== null)
            return this.totalCount

        try {
            const cleanQuery = this.baseQuery
                .trim()
                .replaceAll(/LIMIT\s+\d+\s*/gi, '')
                .replaceAll(/OFFSET\s+\d+\s*/gi, '')

            const countQuery = `SELECT COUNT(*) as count FROM (${cleanQuery}) AS __count_query`
            const reader = await this._duckConnection.runAndReadAll(
                countQuery,
                this.queryParams
            )
            const rows = reader.getRowObjects()
            this.totalCount = Number(rows[0]?.count ?? 0)
            return this.totalCount
        } catch (err) {
            Logger.Error(`LazyResult.length: Error counting rows: ${(err as Error).message}`)
            return 0
        }
    }

    async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
        while (!this.done) {
            const batch = await this._fetchBatch()
            if (batch.length === 0) break

            for (const item of batch) {
                yield item
            }
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
        for await (const item of this) {
            out.push(await callback(item, idx++))
        }
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
        for await (const item of this) {
            out.push(item)
        }
        return out
    }

    clearCache(): void {
        this.cache.clear()
        this.offset = 0
        this.done = false
    }
}

export class DataTable extends clsClonable {
    // static

    @Logger.LogFunction(true)
    static Is(dataTable: unknown): dataTable is DataTable {
        return dataTable instanceof DataTable
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
    private _encryptionKey?: string
    private _writeLock: Promise<void> = Promise.resolve();
    private _queue: Promise<unknown> = Promise.resolve();
    private _lock: Mutex = new Mutex()
    private _rows?: TRow[]
    private _isAttached: boolean = false
    private _isDisposed: boolean = false


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
            this._dbPath = StringUtils.Path(DATATABLE_TEMP_PATH, `${this.Name}_${Utils.Uuid(true)}.db`)
            this._persistent = opt.persistant ?? false

            // Generate encryption key for persistent databases
            if (this._persistent) {
                this._encryptionKey = Utils.Uuid()
            }
        }

        // If initial rows provided, persist them during lazy init later
        if (rows) {
            this._rows = Array.isArray(rows)
                ? rows
                : [rows]
        }

    }


    [Symbol.dispose](): void {
        if (this._isDisposed)
            return

        this.MetaData = {}

        if (this._isAttached) {
            this._duckConnection?.run(duckDb_Sql_DropTable(this.Name))
            this._isDisposed = true
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
        this._isDisposed = true
        Logger.Debug(`${Logger.Out} 🗑️  DataTable '${this.Name}' destroyed`)
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
            this._duckInstance = await DuckDBInstance.create(':memory:')

            // For persistent databases with encryption
            if (this._persistent && this._encryptionKey && this._dbPath) {
                // Create in-memory instance first
                const cnx = await this._duckInstance.connect()
                try {
                    // Attach encrypted database
                    await cnx.run(`
                        ATTACH '${this._dbPath}' AS ${this.SafeName}
                        (ENCRYPTION_KEY '${this._encryptionKey}');
                    `)
                    Logger.Debug(`DataTable '${this.Name}': attached encrypted database: ${this._dbPath}`)
                    cnx.closeSync()
                } catch (err) {
                    Logger.Error(`DataTable '${this.Name}': Failed to attach encrypted database: ${(err as Error).message}`)
                    throw err
                }
            }
        }

        if (!this._duckConnection) {
            this._duckConnection = await this._duckInstance.connect()
            if (this._persistent) {
                await this._duckConnection.run(`USE ${this.SafeName};`)
            }
        }

        const cnx = this._duckConnection
        await this._lock.Acquire()
        {
            // tune performance
            await cnx.run(`
                SET memory_limit = '8GB';
                SET temp_directory = '${DATATABLE_TEMP_PATH}';
                SET threads = ${Math.max(1, Math.floor((cpus().length ?? 1) / 2))};
                SET preserve_insertion_order=false;
            `)

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
    async Rename(name: string): Promise<this> {
        Assert.Condition(!StringUtils.IsEmpty(name), "DataTable.Rename: name must not be empty")
        await this._dbEnsureInitialized()
        const cnx = this._duckConnection!
        return cnx.run(duckDb_Sql_RenameTable(this.Name, name))
            .then(() => {
                this.Name = name
                return this
            })
            .catch((err) => {
                Logger.Error(`DataTable.Rename: ${err}`)
                return this
            })
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
                table_name = '${this.SafeName.replaceAll(/"/g, '')}'
            `
        const reader = await cnx.runAndReadAll(sql)
        const stats = reader.getRowObjects()[0]
        Assert.Var<Record<string, DuckDBValue>>(stats, 'stats is undefined')

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

        return this._runSqlAndGetRows(sql, undefined, {
            includeIndex,
            fields,
            fnMap
        })
            .then(rows => {
                if (fnFilter)
                    return rows.filter(row => fnFilter(row))
                return rows
            })
            .catch(async (err) => {
                const tables = await this._duckConnection!.runAndReadAll("show tables;")
                    .then(reader => reader.getRowObjects())
                    .catch(err => {
                        Logger.Error(`DataTable.Rows: '${this.Name}' Error executing SQL query: '${sql}': ${err.message}`)
                        throw new Error(`DataTable.Rows: '${this.Name}' Error executing SQL query: '${sql}': ${err.message}`)
                    })
                Logger.Error(`DataTable.Rows: '${this.Name}' Error executing SQL query: '${sql}': ${err.message}\r\ncandidate tables:\r\n${JSON.stringify(tables)}`)
                throw new Error(`DataTable.Rows: '${this.Name}' Error executing SQL query: '${sql}': ${err.message}`)
            })
    }

    /**
 * Streaming async iterator (lazy) over DB rows - memory efficient
 */
    @Logger.LogFunction(true)
    async RowsIterator(params: TRowsIteratorParams = {}): Promise<AsyncIterableIterator<TRow>> {
        const {
            includeIndex = false,
            fields,
            filter,
            fnMap,
            fnFilter,
            batchSize = this.BatchSize,
            abortSignal
        } = params

        Assert.Condition(batchSize > 0, "batchSize must be greater than 0")

        // Build base query with SQL filtering if provided
        const sql = dataTable_constructSql({
            includeIndex,
            fields,
            filter,
            skip: undefined,
            limit: undefined,
            sort: '__seq__', // Always sort by __seq__ for consistent ordering
            safeName: this.SafeName
        })

        await this._dbEnsureInitialized()

        const lazy = new LazyResult<TRow>(
            this._duckConnection!,
            sql,
            [],
            (row: Record<string, DuckDBValue>) => duckDb_row_parser({
                row,
                fields,
                includeIndex,
                fnMap
            }),
            batchSize
        )

        // If fnFilter is provided, wrap the iterator with the filter
        if (fnFilter) {
            return (async function* () {
                for await (const r of lazy) {
                    if (await fnFilter(r)) yield r
                }
            })()
        }

        return lazy[Symbol.asyncIterator]()
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
        await this.RowsDelete().catch()
        await this._dbPersistRows(__data__)

        return this.FieldsSet()
    }

    @Logger.LogFunction(true)
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
                Logger.Error(`${Logger.Out} DataTable.RowsDelete: Failed to delete from '${this.SafeName}': ${JsonUtils.Stringify(error)}`)
                return this
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
    async RowUpdateByIndex(index?: TUuidv7, row?: TJson | TRow, opt: { skipFieldsSet?: boolean } = {}): Promise<this> {
        if (!index || !row)
            return this

        await this._RowUpdateByIndex(index, row)

        if (opt.skipFieldsSet)
            return this

        return this.FieldsSet()
    }

    /**
     * Enqueues a function to run sequentially in the single-writer queue.
     * This ensures high-throughput updates without lock contention.
     */
    private _enqueue<T>(fn: () => Promise<T>): Promise<T> {
        const next = this._queue.then(fn);
        this._queue = next.catch(() => { }) as Promise<unknown>;
        return next;
    }

    private async _RowUpdateByIndex(index: TUuidv7, row: TJson | TRow): Promise<void> {
        await this._dbEnsureInitialized()
        const cnx = this._duckConnection!
        const __data__ = JsonUtils.Stringify(row)

        // Use single-writer queue for high-throughput updates
        await this._enqueue(async () => {
            const sql = `
                UPDATE ${this.SafeName}
                SET __data__ = ?
                WHERE __idx__ = ?
                `
            try {
                await cnx.run(sql, [__data__, index])
            } catch (error) {
                Logger.Error(`${Logger.Out} DataTable._RowUpdateByIndex: Failed to update row in '${this.SafeName}' with index '${index}': ${JsonUtils.Stringify(error)}`)
                throw error
            }
        })
    }


    @Logger.LogFunction(true)
    async RowsMap(fnMap: (row: Partial<TRow>) => Promise<TRow>, condition?: string): Promise<this> {
        if (!fnMap) {
            Logger.Warn(`${Logger.Out} DataTable.RowsMap: No map function provided`)
            return this
        }

        const rowCount = await this.Count()
        if (rowCount === 0) {
            Logger.Info(`${Logger.Out} DataTable.RowsMap: No rows to map`)
            return this
        }

        await this._dbEnsureInitialized()
        const cnx = this._duckConnection!

        try {
            await cnx.run('BEGIN TRANSACTION')

            const iterator = await this.RowsIterator({
                includeIndex: true,
                filter: condition
            })

            let processedCount = 0
            const batchSize = 50 // Process updates in batches to avoid memory issues

            for await (const rowData of iterator) {
                try {
                    const updatedRow = await fnMap(rowData)

                    if (rowData.__idx__) {
                        const __data__ = JsonUtils.Stringify(updatedRow)
                        await cnx.run(
                            `UPDATE ${this.SafeName} SET __data__ = ? WHERE __idx__ = ?`,
                            [__data__, rowData.__idx__]
                        )
                        processedCount++

                        // Commit in batches to avoid transaction getting too large
                        if (processedCount % batchSize === 0) {
                            await cnx.run('COMMIT')
                            await cnx.run('BEGIN TRANSACTION')
                        }
                    } else {
                        Logger.Warn(`DataTable.RowsMap: Row missing __idx__`)
                    }
                } catch (err) {
                    Logger.Error(`DataTable.RowsMap: Error processing row: ${JsonUtils.Stringify(err)}`)
                    throw err
                }
            }

            await cnx.run('COMMIT')
            Logger.Info(`${Logger.Out} DataTable.RowsMap: Processed ${processedCount} rows successfully`)
        } catch (err) {
            try {
                await cnx.run('ROLLBACK')
            } catch (rbErr) {
                Logger.Error(`DataTable.RowsMap: Rollback failed: ${(rbErr as Error).message}`)
            }
            Logger.Error(`${Logger.Out} DataTable.RowsMap: Error mapping rows: ${JsonUtils.Stringify(err)}`)
            throw err
        }

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

    @Logger.LogFunction(true)
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

    @Logger.LogFunction(true)
    async Pick(fields: string[]): Promise<this> {
        if (!fields || fields.length === 0)
            return this

        Logger.Info(`${Logger.Out} DataTable.Pick: Starting to pick fields ${fields.join(', ')}`)

        return this.RowsMap(async (row: TRow) => {
            const filtered: TRow = {}

            // Keep only the specified fields
            for (const field of fields) {
                // eslint-disable-next-line no-prototype-builtins
                if (row.hasOwnProperty(field)) {
                    filtered[field] = (row as any)[field]
                }
            }

            return filtered
        }).then(() => {
            Logger.Info(`${Logger.Out} DataTable.Pick: Successfully picked ${fields.length} fields`)
            return this
        })
    }

    @Logger.LogFunction(true)
    async Omit(fields: string[]): Promise<this> {
        if (!fields || fields.length === 0)
            return this

        Logger.Info(`${Logger.Out} DataTable.Omit: Starting to omit fields ${fields.join(', ')}`)

        return this.RowsMap(async (row: TRow) => {
            const filtered: TRow = {}

            // Keep all fields except the ones to omit
            for (const [key, value] of Object.entries(row)) {
                if (!fields.includes(key)) {
                    filtered[key] = value
                }
            }

            return filtered
        }).then(() => {
            Logger.Info(`${Logger.Out} DataTable.Omit: Successfully omitted ${fields.length} fields`)
            return this
        })
    }

    // @Logger.LogFunction(true)
    // async Map(fnMap: (row: TRow) => TRow): Promise<this> {
    //     const iterator = await this.RowsIterator({ includeIndex: true });

    //     for await (const row of iterator) {
    //         const __idx__ = row.__idx__;
    //         const newData = fnMap(row);
    //         await this.RowUpdateByIndex(__idx__, newData);
    //     }

    //     return this.FieldsSet()
    // }

    @Logger.LogFunction(true)
    async ForEach<T>(fnForEach: (row: TRow) => T | Promise<T>, params: TRowsIteratorParams = {}): Promise<T[]> {
        const iterator = await this.RowsIterator(params);

        const promises: (T | Promise<T>)[] = [];
        for await (const row of iterator) {
            promises.push(fnForEach(row));
        }

        return Promise.all(promises);
    }
}