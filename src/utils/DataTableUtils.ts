/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable no-case-declarations */
//
//
//
import DataType, { DuckDBScalarFunction } from "@duckdb/node-api"
import { createHash, createHmac, randomUUID } from "node:crypto"
import { omit } from "lodash-es"
import fs from 'node:fs'
//
import { DataTable, dataTable_convertSql, DATATABLE_TEMP_PATH, duckDb_Sql_CreateTable, duckDb_Sql_DropTable, duckDb_Sql_RenameTable, type TRow } from "../types/DataTable"
import { JsonUtils } from "./JsonUtils"
import { Logger } from "./Logger"
import { StringUtils } from "./StringUtils"


//
export enum JOIN_TYPE {
    LEFT = "left",
    RIGHT = "right",
    INNER = "inner",
    FULL_OUTER = "full-outer",
    CROSS = "cross"
}


export enum REMOVE_DUPLICATES_METHOD {
    HASH = "hash",
    EXACT = "exact",
    IGNORE_CASE = "ignorecase"
}


export enum REMOVE_DUPLICATES_STRATEGY {
    FIRST = "first",
    LAST = "last",
    HIGHEST = "highest",
    LOWEST = "lowest",
    CUSTOM = "custom"
}


const HASH_ALGO = 'sha256'
const HASH_DIGEST = 'base64'
const HASH_PEPPER = process.env.HASH_PEPPER || "m3t4l-m!l!t!4"


//
export type TSyncReport = {
    AddedRows: TRow[]
    DeletedRows: TRow[]
    UpdatedRows: TRow[]
}


//
function pseudonymize(value: string): string {
    return createHmac(HASH_ALGO, HASH_PEPPER)
        .update(value)
        .digest(HASH_DIGEST)
}

function anonymize(value: string): string {
    return createHash(HASH_ALGO)
        .update(value + randomUUID())
        .digest(HASH_DIGEST)
}

function normalizeValue(val: unknown): string {
    if (val === null || val === undefined) return ""
    if (val instanceof Date) return val.toISOString()
    if (typeof val === "object") {
        try {
            return JsonUtils.Stringify(val)
        } catch {
            return String(val)
        }
    }
    return String(val)
}


//
export class DataTableUtils {
    @Logger.LogFunction(true)
    static async PrefixAllFields(dt: DataTable, prefix: string): Promise<DataTable> {
        // transform every row in DB by prefixing field names (done inside DuckDB)
        await dt._dbEnsureInitialized()
        const conn = dt._duckConnection!

        // ensure prefix ends with dot like your original code did: `${prefix}.${k}`
        const normalizedPrefix = prefix.endsWith('.')
            ? prefix
            : `${prefix}.`

        const sql = `
                UPDATE 
                    ${dt.SafeName}
                SET 
                    __data__ = CAST(sub.new_data AS VARCHAR)
                FROM (
                SELECT
                    __idx__,
                    json_group_object(
                    CONCAT(?, key),                                           -- prefixed key
                    json_extract(CAST(__data__ AS JSON), '$.' || key)         -- original value
                    ) AS new_data
                FROM ${dt.SafeName},
                    UNNEST(json_keys(CAST(__data__ AS JSON))) AS t(key)       -- explode top-level keys
                WHERE 
                    json_type(CAST(__data__ AS JSON)) = 'OBJECT'              -- only object rows
                GROUP BY 
                    __idx__
                ) AS sub
                WHERE 
                    ${dt.SafeName}.__idx__ = sub.__idx__;
                `

        // bind the normalized prefix once (positional parameter)
        await conn.run(sql, [normalizedPrefix])

        // refresh fields / metadata as you did before
        await dt.FieldsSet()
        return dt
    }

    @Logger.LogFunction(true)
    static async UnPrefixAllfields(dt: DataTable): Promise<DataTable> {
        for await (const row of await dt.RowsIterator({ batchSize: dt.BatchSize, includeIndex: true })) {
            const __data__: TRow = {}
            for (const [key, value] of Object.entries(omit(row, ['__idx__']))) {
                const _unprefixedKey = key.includes('.')
                    ? key.substring(key.indexOf('.') + 1)
                    : key
                __data__[_unprefixedKey] = value
            }
            await dt.RowUpdateByIndex(row.__idx__, __data__)
        }

        await dt.FieldsSet()
        return dt
    }

    @Logger.LogFunction(true)
    static async LeftJoin(dtA: DataTable, dtB: DataTable, leftField: string, rightField: string): Promise<DataTable> {
        await dtA._dbEnsureInitialized()
        await dtB._dbEnsureInitialized()
        const conn = dtA._duckConnection!

        // Create result table
        const resultTable = `result`
        await conn.run(duckDb_Sql_DropTable(resultTable))

        // Create temporary table for dtB rows
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_CreateTable(dtB.Name))

        // Load dtB rows into temp table
        for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
            await conn.run(`
                    INSERT INTO ${dtB.SafeName}
                        (__data__) 
                    VALUES 
                        (?)`,
                [JsonUtils.Stringify(row)]
            )
        }

        // Perform left join with temp table
        await conn.run(`
                CREATE TABLE ${resultTable} AS
                    SELECT 
                        l.__seq__,
                        l.__idx__,
                        CAST(
                            CASE 
                            WHEN r.__data__ IS NULL THEN l.__data__
                            ELSE json_merge_patch(
                                CAST(l.__data__ AS JSON),
                                CAST(r.__data__ AS JSON)
                            )
                            END 
                        AS VARCHAR) as __data__,
                        l.created_at
                    FROM 
                        ${dtA.SafeName} l
                    LEFT JOIN 
                        ${dtB.SafeName} r
                    ON 
                        json_extract(CAST(l.__data__ AS JSON), '$.${leftField}') = json_extract(CAST(r.__data__ AS JSON), '$.${rightField}')
                    ORDER BY 
                        l.__seq__
            `)

        // Cleanup
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_DropTable(dtA.Name))
        await conn.run(duckDb_Sql_RenameTable(resultTable, dtA.Name))

        // Reset fields from new data
        await dtA.FieldsSet()
        return dtA
    }

    @Logger.LogFunction(true)
    static async InnerJoin(dtA: DataTable, dtB: DataTable, leftField: string, rightField: string): Promise<DataTable> {
        await dtA._dbEnsureInitialized()
        await dtB._dbEnsureInitialized()
        const conn = dtA._duckConnection!

        // Create result table
        const resultTable = `result`
        await conn.run(duckDb_Sql_DropTable(resultTable))

        // Create temporary table for dtB rows
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_CreateTable(dtB.Name))

        // Load dtB rows into temp table
        for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
            await conn.run(`
                    INSERT INTO ${dtB.SafeName}
                        (__data__) 
                    VALUES 
                        (?)`,
                [JsonUtils.Stringify(row)]
            )
        }

        // Perform inner join with temp table (merge left and right JSON)
        await conn.run(`
                CREATE TABLE ${resultTable} AS
                    SELECT 
                        l.__seq__,
                        l.__idx__,
                        CAST(
                            json_merge_patch(
                                CAST(l.__data__ AS JSON),
                                CAST(r.__data__ AS JSON)
                            ) AS VARCHAR
                        ) as __data__,
                        l.created_at
                    FROM 
                        ${dtA.SafeName} l
                    INNER JOIN 
                        ${dtB.SafeName} r
                    ON 
                        json_extract(CAST(l.__data__ AS JSON), '$.${leftField}') = json_extract(CAST(r.__data__ AS JSON), '$.${rightField}')
                    ORDER BY 
                        l.__seq__
            `)

        // Cleanup temp tables and replace original table with result
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_DropTable(dtA.Name))
        await conn.run(duckDb_Sql_RenameTable(resultTable, dtA.Name))

        // Reset fields from new data
        await dtA.FieldsSet()
        return dtA
    }

    @Logger.LogFunction(true)
    static async RightJoin(dtA: DataTable, dtB: DataTable, leftField: string, rightField: string): Promise<DataTable> {
        await dtA._dbEnsureInitialized()
        await dtB._dbEnsureInitialized()
        const conn = dtA._duckConnection!

        // Create result table
        const resultTable = `result`
        await conn.run(duckDb_Sql_DropTable(resultTable))

        // Create temporary table for dtB rows
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_CreateTable(dtB.Name))

        // Load dtB rows into temp table
        for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
            await conn.run(`
                    INSERT INTO ${dtB.SafeName}
                        (__data__) 
                    VALUES 
                        (?)`,
                [JsonUtils.Stringify(row)]
            )
        }

        // Perform right join with temp table (merge right and left JSON)
        await conn.run(`
                CREATE TABLE ${resultTable} AS
                    SELECT 
                        r.__seq__,  -- use right table sequence for ordering
                        r.__idx__,  -- keep right table UUID
                        CAST(
                            CASE 
                            WHEN l.__data__ IS NULL THEN r.__data__
                            ELSE json_merge_patch(
                                CAST(l.__data__ AS JSON),
                                CAST(r.__data__ AS JSON)
                            )
                            END 
                        AS VARCHAR) as __data__,
                        COALESCE(r.created_at, l.created_at) as created_at
                    FROM 
                        ${dtB.SafeName} r  -- right table first
                    LEFT JOIN 
                        ${dtA.SafeName} l  -- left table second
                    ON 
                        json_extract(CAST(r.__data__ AS JSON), '$.${rightField}') = json_extract(CAST(l.__data__ AS JSON), '$.${leftField}')
                    ORDER BY 
                        r.__seq__
            `)

        // Cleanup temp tables and replace original table with result
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_DropTable(dtA.Name))
        await conn.run(duckDb_Sql_RenameTable(resultTable, dtA.Name))

        // Reset fields from new data
        await dtA.FieldsSet()
        return dtA
    }

    @Logger.LogFunction(true)
    static async FullOuterJoin(dtA: DataTable, dtB: DataTable, leftField: string, rightField: string): Promise<DataTable> {
        await dtA._dbEnsureInitialized()
        await dtB._dbEnsureInitialized()
        const conn = dtA._duckConnection!

        // Create result table
        const resultTable = `result`
        await conn.run(duckDb_Sql_DropTable(resultTable))

        // Create temporary table for dtB rows
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_CreateTable(dtB.Name))

        // Load dtB rows into temp table
        for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
            await conn.run(`
                    INSERT INTO ${dtB.SafeName}
                        (__data__) 
                    VALUES 
                        (?)`,
                [JsonUtils.Stringify(row)]
            )
        }

        // Perform full outer join with temp table
        await conn.run(`
                CREATE TABLE ${resultTable} AS
                    WITH joined AS (
                        SELECT 
                            COALESCE(l.__seq__, r.__seq__) as __seq__,
                            COALESCE(l.__idx__, r.__idx__) as __idx__,
                            CAST(
                                CASE 
                                WHEN l.__data__ IS NULL THEN r.__data__
                                WHEN r.__data__ IS NULL THEN l.__data__
                                ELSE json_merge_patch(
                                    CAST(l.__data__ AS JSON),
                                    CAST(r.__data__ AS JSON)
                                )
                                END 
                            AS VARCHAR) as __data__,
                            COALESCE(l.created_at, r.created_at) as created_at
                        FROM 
                            ${dtA.SafeName} l
                        FULL OUTER JOIN 
                            ${dtB.SafeName} r
                        ON 
                            json_extract(CAST(l.__data__ AS JSON), '$.${leftField}') = json_extract(CAST(r.__data__ AS JSON), '$.${rightField}')
                    )
                    SELECT 
                        *,
                        ROW_NUMBER() OVER (ORDER BY __seq__) as new_seq
                    FROM 
                        joined
            `)

        // Fix sequence numbers to be continuous
        await conn.run(`
                UPDATE ${resultTable} 
                SET __seq__ = new_seq;
            `)

        // Cleanup temp tables and replace original table with result
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_DropTable(dtA.Name))
        await conn.run(duckDb_Sql_RenameTable(resultTable, dtA.Name))

        // Reset fields from new data
        await dtA.FieldsSet()
        return dtA
    }

    @Logger.LogFunction(true)
    static async CrossJoin(dtA: DataTable, dtB: DataTable): Promise<DataTable> {
        await dtA._dbEnsureInitialized()
        await dtB._dbEnsureInitialized()
        const conn = dtA._duckConnection!

        // Create result table
        const resultTable = `result`
        await conn.run(duckDb_Sql_DropTable(resultTable))

        // Create temporary table for dtB rows
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_CreateTable(dtB.Name))

        // Load dtB rows into temp table
        for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
            await conn.run(`
                    INSERT INTO ${dtB.SafeName}
                        (__data__) 
                    VALUES 
                        (?)`,
                [JsonUtils.Stringify(row)]
            )
        }

        // Perform cross join with temp table
        await conn.run(`
                CREATE TABLE ${resultTable} AS
                    SELECT 
                        ROW_NUMBER() OVER () as __seq__,    -- new sequential IDs
                        uuidv7() as __idx__,                -- new UUIDs for crossed rows
                        CAST(
                            json_merge_patch(
                                CAST(l.__data__ AS JSON),
                                CAST(r.__data__ AS JSON)
                            )
                        AS VARCHAR) as __data__,
                        COALESCE(l.created_at, r.created_at) as created_at
                    FROM 
                        ${dtA.SafeName} l
                    CROSS JOIN 
                        ${dtB.SafeName} r
            `)

        // Cleanup temp tables and replace original table with result
        await conn.run(duckDb_Sql_DropTable(dtB.Name))
        await conn.run(duckDb_Sql_DropTable(dtA.Name))
        await conn.run(duckDb_Sql_RenameTable(resultTable, dtA.Name))

        // Reset fields from new data
        await dtA.FieldsSet()
        return dtA
    }

    @Logger.LogFunction(true)
    static async RemoveDuplicates(
        dt: DataTable,
        fields: string[] | undefined = undefined,
        method: string = REMOVE_DUPLICATES_METHOD.HASH,
        strategy: string = REMOVE_DUPLICATES_STRATEGY.FIRST,
        condition: string | undefined = undefined
    ): Promise<DataTable> {
        await dt._dbEnsureInitialized()
        const conn = dt._duckConnection!

        // If no fields specified, use all fields from the first row
        const _fields = (fields && fields.length > 0)
            ? fields
            : dt.GetFieldsName()

        // Skip if no fields to deduplicate on
        if (_fields.length === 0) {
            return dt
        }

        // Create a temporary table for deduplication
        const tempTableName = `temp_dedup_${Date.now()}`

        try {
            // Create temp table with the same structure as the original
            const sqlCreateTempTable = `
                CREATE TEMP TABLE ${tempTableName} AS SELECT * FROM ${dt.SafeName} LIMIT 0;
                ALTER TABLE ${tempTableName} ADD COLUMN rn INTEGER;
                `
            await conn.run(sqlCreateTempTable)

            // Build the deduplication query based on method and strategy
            const fieldList = _fields.map(f => `(__data__->>'$.${f}')`)
            let orderByClause = ''
            let whereClause = ''
            let methodClause = ''
            switch (strategy) {
                case REMOVE_DUPLICATES_STRATEGY.LAST:
                    orderByClause = 'ORDER BY __seq__ DESC'
                    break

                case REMOVE_DUPLICATES_STRATEGY.HIGHEST:
                case REMOVE_DUPLICATES_STRATEGY.LOWEST:
                    if (!condition || condition.trim() === '') {
                        // If no condition given, fallback to seq ordering
                        orderByClause = 'ORDER BY __seq__ ASC'
                        break
                    }

                    // Normalization expression: tries numeric conversion, maps textual booleans to numbers, otherwise NULL
                    const valueNormExpr = `
                        CASE
                            WHEN TRY_CAST(__data__->>'$.${condition}' AS DOUBLE) IS NOT NULL
                                THEN TRY_CAST(__data__->>'$.${condition}' AS DOUBLE)
                            WHEN LOWER(__data__->>'$.${condition}') = 'true'  THEN 1.0
                            WHEN LOWER(__data__->>'$.${condition}') = 'false' THEN 0.0
                            ELSE NULL
                        END`
                        .replaceAll(/\s+/g, ' '); // remove excessive whitespace for readability in SQL

                    // A small helper: prefer rows with a defined value (0) before undefined (1)
                    const definedFirstExpr = `
                        CASE
                            WHEN TRY_CAST(__data__->>'$.${condition}' AS DOUBLE) IS NOT NULL THEN 0
                            WHEN LOWER(__data__->>'$.${condition}') IN ('true','false') THEN 0
                            ELSE 1
                        END`
                        .replaceAll(/\s+/g, ' ');

                    if (strategy === REMOVE_DUPLICATES_STRATEGY.HIGHEST) {
                        // prefer defined rows, then highest normalized value
                        orderByClause = `ORDER BY ${definedFirstExpr}, (${valueNormExpr}) DESC, __seq__ ASC`
                    } else { // LOWEST
                        // prefer defined rows, then lowest normalized value
                        orderByClause = `ORDER BY ${definedFirstExpr}, (${valueNormExpr}) ASC, __seq__ ASC`
                    }
                    break

                case REMOVE_DUPLICATES_STRATEGY.CUSTOM:
                    whereClause = `CASE WHEN ${dataTable_convertSql(condition)} THEN 0 ELSE 1 END`
                    orderByClause = `ORDER BY ${whereClause}, __seq__ ASC` // Default order for custom strategy
                    break

                case REMOVE_DUPLICATES_STRATEGY.FIRST:
                default:
                    orderByClause = 'ORDER BY __seq__ ASC'
                    break
            }


            // Handle different deduplication methods
            switch (method) {
                case REMOVE_DUPLICATES_METHOD.IGNORE_CASE:
                    methodClause = fieldList.map(f => `LOWER(${f})`).join(', ')
                    break

                case REMOVE_DUPLICATES_METHOD.EXACT:
                case REMOVE_DUPLICATES_METHOD.HASH:
                default:
                    methodClause = fieldList.join(', ')
                    break
            }

            const dedupQuery = `
                INSERT INTO ${tempTableName}(__data__)
                SELECT __data__ FROM ${dt.SafeName}
                QUALIFY ROW_NUMBER() OVER (
                    PARTITION BY ${methodClause}
                    ${orderByClause}
                ) = 1
                ORDER BY __seq__ ASC
                `

            // Execute the deduplication
            await conn.run(dedupQuery)

            // Replace the original table with the deduplicated data
            await conn.run(`DELETE FROM ${dt.SafeName}`)
            await conn.run(`INSERT INTO ${dt.SafeName}(__data__) SELECT __data__ FROM ${tempTableName}`)
        } catch (error) {
            Logger.Error(`${Logger.Out} DataTableUtils.RemoveDuplicates: Failed to remove duplicates: ${error}`)
            throw error
        } finally {
            // Clean up temp table
            await conn.run(`DROP TABLE IF EXISTS ${tempTableName}`)
        }
        return dt
    }

    @Logger.LogFunction(true)
    static async Anonymize(
        dt: DataTable,
        fields: string | string[],
        pseudo = true
    ): Promise<DataTable> {
        let _fields: string[] = typeof fields === "string"
            ? fields.split(",").map(f => f.trim()).filter(Boolean)
            : fields.map(f => f.trim())

        if (_fields.length === 1 && _fields[0] === "*") {
            await dt.FieldsSet()
            _fields = dt.GetFieldsName() ?? []
        }

        await dt._dbEnsureInitialized()
        const cnx = dt._duckConnection!

        const funcName = 'anonymize'

        // Register only the transformation functions (pseudonymize/anonymize)
        try {
            cnx.registerScalarFunction(
                DuckDBScalarFunction.create({
                    name: funcName,
                    parameterTypes: [DataType.VARCHAR],
                    returnType: DataType.VARCHAR,
                    mainFunction: (info, input, output) => {
                        const inputVector = input.getColumnVector(0);
                        const fieldsSet = new Set(_fields);  // ✅ Cache field lookup

                        for (let i = 0; i < input.rowCount; i++) {
                            const item = inputVector.getItem(i);
                            if (item === null) {
                                output.setItem(i, null);
                                continue;
                            }

                            const row: TRow = JsonUtils.TryParse(item as string, {})
                            let modified = false;  // ✅ Track if changes were made

                            for (const field of fieldsSet) {  // Use Set for O(1) lookup
                                if (field in row) {
                                    const val = normalizeValue(row[field])
                                    const newVal = pseudo ? pseudonymize(val) : anonymize(val)

                                    if (val !== newVal) {
                                        row[field] = newVal
                                        modified = true;
                                    }
                                }
                            }

                            // ✅ Only stringify if modified
                            output.setItem(i, modified ? JsonUtils.Stringify(row) : item)
                        }
                        output.flush();
                    }
                })
            );
        } catch (error) {
            Logger.Error(`Error in Anonymize: ${error}`)
        }

        const whereClause = _fields.length > 0
            ? 'WHERE ' + _fields
                .map(f => `json_exists(__data__, '${f}')`)
                .join(' OR ')
            : ''

        const sql =
            `UPDATE 
                    ${dt.SafeName} 
                SET 
                    __data__ = ${funcName}(__data__)
                ${whereClause}`


        // Update the table with the anonymized rows
        await cnx.run(sql)
        return dt
    }

    @Logger.LogFunction(true)
    static async SyncReport(
        {
            source,
            destination,
            on,
            includeIndex = false
        }: {
            source: DataTable,
            destination: DataTable,
            on: string,
            includeIndex?: boolean
        }): Promise<TSyncReport> {

        await Promise.all([
            source.RowsSet(),
            destination.RowsSet()
        ])

        if (!Object.keys(source.Fields).includes(on))
            throw new Error(`Field ${on} not found in source table`)

        if (!Object.keys(destination.Fields).includes(on) && (await destination.Count()) > 0)
            throw new Error(`Field ${on} not found in destination table`)

        await source._dbEnsureInitialized();
        const conn = source._duckConnection!

        const addedName = `added`
        const deletedName = `deleted`
        const updatedName = `updated`

        // Create table for dtDestination rows
        await conn.run(duckDb_Sql_DropTable(destination.Name))
        await conn.run(duckDb_Sql_CreateTable(destination.Name))

        // Load dtDestination rows into temp table
        for await (const row of await destination.RowsIterator({ batchSize: source.BatchSize })) {
            await conn.run(`
                INSERT INTO ${destination.SafeName}
                    (__data__) 
                VALUES 
                    (?)`,
                [JsonUtils.Stringify(row)]
            )
        }

        const sourceName = source.SafeName;
        const destinationName = destination.SafeName;

        // Get added rows (in source but not in destination)
        await conn.run(duckDb_Sql_DropTable(addedName))
        await conn.run(duckDb_Sql_CreateTable(addedName))

        const addedSql = `
            INSERT INTO ${addedName}
                (__data__) 
            SELECT
                s.__data__
            FROM
                ${sourceName} s
            WHERE
                (s.__data__->'${on}') NOT IN (
                    SELECT (d.__data__->'${on}')
                    FROM ${destinationName} d
                )
            ;
            SELECT
                *
            FROM
                ${addedName}
            `;

        // Get deleted rows (in destination but not in source)
        await conn.run(duckDb_Sql_DropTable(deletedName))
        await conn.run(duckDb_Sql_CreateTable(deletedName))

        const deletedSql = `
            INSERT INTO ${deletedName}
                (__data__) 
            SELECT
                d.__data__
            FROM
                ${destinationName} d
            WHERE
                (d.__data__->'${on}') NOT IN (
                    SELECT (s.__data__->'${on}')
                    FROM ${sourceName} s
                )
            ;
            SELECT
                *
            FROM
                ${deletedName}
            `;

        // Get updated rows (in both but with different content)
        await conn.run(duckDb_Sql_DropTable(updatedName))
        await conn.run(duckDb_Sql_CreateTable(updatedName))

        const updatedSql = `
            INSERT INTO ${updatedName}
                (__data__) 
            SELECT
                s.__data__
            FROM
                ${sourceName} s
            WHERE
                s.__data__ != (
                    SELECT d.__data__ 
                    FROM ${destinationName} d
                    WHERE (d.__data__->'${on}') = (s.__data__->'${on}')
                )
            ;
            SELECT
                *
            FROM
                ${updatedName}
            `;

        try {
            const addedRows = await source._runSqlAndGetRows(addedSql, undefined, { includeIndex });
            const deletedRows = await source._runSqlAndGetRows(deletedSql, undefined, { includeIndex });
            const updatedRows = await source._runSqlAndGetRows(updatedSql, undefined, { includeIndex });
            // const [addedRows, deletedRows, updatedRows] = await Promise.all([
            //     dtSource._runSqlAndGetRows(addedSql),
            //     dtSource._runSqlAndGetRows(deletedSql),
            //     dtSource._runSqlAndGetRows(updatedSql)
            // ]);

            return {
                AddedRows: addedRows,
                DeletedRows: deletedRows,
                UpdatedRows: updatedRows
            };
        } catch (error) {
            console.error('Error in SyncReport:', error);
            throw error;
        }
    }

    @Logger.LogFunction(true)
    static async SetFromDataTable(target: DataTable, source: DataTable): Promise<DataTable> {
        await source._dbEnsureInitialized()
        await target._dbEnsureInitialized()

        const sourceConn = source._duckConnection!
        const targetConn = target._duckConnection!

        // Use a temp file for transfer to avoid memory pressure
        const tempFile = StringUtils.Path(DATATABLE_TEMP_PATH, `${randomUUID()}.parquet`)

        try {
            // Export source to parquet
            await sourceConn.run(`COPY ${source.SafeName} TO '${tempFile}' (FORMAT PARQUET)`)

            // Clear target
            await target.RowsDelete()

            // Import from parquet to target
            // We need to map the columns correctly. 
            // The parquet file will have columns: __seq__, __idx__, __data__, created_at
            // We want to insert into target, but let target generate its own __seq__ and __idx__ if needed?
            // Actually, if we are "Setting From", we probably want an exact copy?
            // But DataTable structure implies __seq__ is auto-generated usually.
            // However, if we want an exact copy of data, we should probably take __data__.
            // Let's assume we want to copy the DATA, so __data__. 
            // If we want to preserve UUIDs (__idx__), we should copy that too.
            // Let's copy __data__ and __idx__. __seq__ and created_at can be regenerated or preserved.
            // If we use INSERT INTO ... SELECT ... we can control this.

            // Let's try to copy everything to preserve exact state if possible, 
            // OR just __data__ if we treat it as new rows.
            // "SetFromDataTable" implies making target look like source.
            // So we should probably replace everything.

            await targetConn.run(`
                INSERT INTO ${target.SafeName} (__idx__, __data__, created_at)
                SELECT __idx__, __data__, created_at FROM read_parquet('${tempFile}')
            `)

            // Update fields
            await target.FieldsSet()

        } finally {
            // Cleanup temp file
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile)
                }
            } catch (err) {
                Logger.Error(`Error cleaning up temp file ${tempFile}: ${err}`)
            }
        }

        return target
    }


    // @Logger.LogFunction(true)
    // async Transpose(renamedColumns?: string[]): Promise<this> {
    //     await this._dbEnsureInitialized()
    //     const conn = this._duckConnection!
    //     const tableName = this._safeName()

    //     // Get all column names excluding internal ones
    //     const columnsResult = await conn.all(`
    //         SELECT column_name
    //         FROM information_schema.columns
    //         WHERE table_name = '${tableName}'
    //         AND column_name NOT IN ('__seq__', '__idx__', 'created_at')
    //         ORDER BY ordinal_position
    //     `)

    //     if (columnsResult.length === 0) return this

    //     // Get all row data as JSON to handle dynamic columns
    //     const rows = await conn.all(`
    //         SELECT to_json(${tableName}) as row_data
    //         FROM ${tableName}
    //     `)

    //     if (rows.length === 0) return this

    //     // Generate the transposed SQL
    //     const columnNames = columnsResult.map(col => col.column_name)
    //     const rowCount = rows.length

    //     // Create a temporary table to store the transposed data
    //     const tempTableName = `temp_transposed_${randomUUID().replaceAll(/-/g, '_')}`

    //     try {
    //         // Create the transposed table with dynamic columns
    //         let createTableSQL = `CREATE TEMP TABLE ${tempTableName} (key VARCHAR, "value" JSON);`
    //         await conn.run(createTableSQL)

    //         // For each original column, create a row in the transposed table
    //         for (const col of columnNames) {
    //             const values = rows.map((row, idx) =>
    //                 `'${idx + 1}' as row_num, '${col}' as key, '${JSON.stringify(JSON.parse(row.row_data)[col])}' as value`
    //             ).join(' UNION ALL ')

    //             const insertSQL = `
    //                 INSERT INTO ${tempTableName} (key, value)
    //                 SELECT key, value FROM (${values})
    //             `
    //             await conn.run(insertSQL)
    //         }

    //         // Pivot the data to get the final transposed result
    //         const pivotCols = Array.from({length: rowCount}, (_, i) =>
    //             `MAX(CASE WHEN row_num = '${i + 1}' THEN value::VARCHAR END) as field_${i + 1}`
    //         ).join(', ')

    //         const pivotSQL = `
    //             SELECT
    //                 key,
    //                 ${pivotCols}
    //             FROM (
    //                 SELECT
    //                     key,
    //                     value,
    //                     ROW_NUMBER() OVER (PARTITION BY key ORDER BY (SELECT NULL)) as row_num
    //                 FROM ${tempTableName}
    //             ) t
    //             GROUP BY key
    //         `

    //         // Create the final transposed table
    //         const finalSQL = `
    //             DROP TABLE IF EXISTS ${tableName};
    //             CREATE TABLE ${tableName} AS
    //             ${pivotSQL};

    //             -- Recreate the sequence and index columns
    //             ALTER TABLE ${tableName} ADD COLUMN __seq__ INTEGER;
    //             ALTER TABLE ${tableName} ADD COLUMN __idx__ VARCHAR;
    //             ALTER TABLE ${tableName} ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    //             UPDATE ${tableName}
    //             SET
    //                 __seq__ = ROW_NUMBER() OVER (),
    //                 __idx__ = gen_random_uuid()::VARCHAR
    //         `

    //         await conn.run(finalSQL)

    //         // Update the fields metadata
    //         const newFields: TFields = {}
    //         columnNames.forEach(col => {
    //             newFields[col] = { type: 'VARCHAR' }
    //         })
    //         await this.SetFields(newFields)

    //         return this

    //     } catch (error) {
    //         Logger.Error(`Error in Transpose: ${error}`)
    //         throw error
    //     } finally {
    //         // Clean up the temporary table
    //         try {
    //             await conn.run(`DROP TABLE IF EXISTS ${tempTableName}`)
    //         } catch (cleanupError) {
    //             Logger.Warn(`Failed to clean up temporary table: ${cleanupError}`)
    //         }
    //     }
    // }
}