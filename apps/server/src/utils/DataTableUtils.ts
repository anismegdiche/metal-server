//
//
//

import { randomUUID } from "node:crypto"
import fs from "node:fs"
import DataType, { DuckDBScalarFunction } from "@duckdb/node-api"
import { Logger } from "@metal/logger"
import { JsonUtils, StringUtils } from "@metal/utils"
import { omit } from "lodash-es"
//
import {
	DataTable,
	dataTable_convertSql,
	duckDb_Sql_CreateTable,
	duckDb_Sql_DropTable,
	duckDb_Sql_RenameTable,
	type TRow,
} from "../types/DataTable"
import { DT_SYS_FIELDS } from "../types/DataTableTypes"
import { Assert } from "./Assert"
import { RowUtils } from "./RowUtils"

//
export enum JOIN_TYPE {
	LEFT = "left",
	RIGHT = "right",
	INNER = "inner",
	FULL_OUTER = "full-outer",
	CROSS = "cross",
}

export enum REMOVE_DUPLICATES_METHOD {
	HASH = "hash",
	EXACT = "exact",
	IGNORE_CASE = "ignorecase",
}

export enum REMOVE_DUPLICATES_STRATEGY {
	FIRST = "first",
	LAST = "last",
	HIGHEST = "highest",
	LOWEST = "lowest",
	CUSTOM = "custom",
}

//
export type TSyncReport = {
	AddedRows: TRow[]
	DeletedRows: TRow[]
	UpdatedRows: TRow[]
}

export const DATATABLE_PAGINATION_META = "__pagination__"

export type TPaginationInfo = {
	total: number
	limit?: number
	offset: number
	hasMore: boolean
}

//
export class DataTableUtils {
	static async SetPagination(
		data: DataTable,
		{ total, limit, offset = 0 }: { total: number; limit?: number; offset?: number },
	): Promise<DataTable> {
		const returned = await data.Count()
		const hasMore = offset + returned < total

		data.MetaDataSet(DATATABLE_PAGINATION_META, <TPaginationInfo>{
			total,
			limit,
			offset,
			hasMore,
		})

		return data
	}

	@Logger.LogFunction(true)
	static async PrefixAllFields(dt: DataTable, prefix: string): Promise<DataTable> {
		// transform every row in DB by prefixing field names (done inside DuckDB)
		const conn = await dt.DuckConnection()

		// ensure prefix ends with dot like your original code did: `${prefix}.${k}`
		const normalizedPrefix = prefix.endsWith(".") ? prefix : `${prefix}.`

		const sql = `
                UPDATE 
                    ${dt.SafeName}
                SET 
                    ${DT_SYS_FIELDS.data} = CAST(sub.new_data AS VARCHAR)
                FROM (
                SELECT
                    ${DT_SYS_FIELDS.idx},
                    json_group_object(
                    CONCAT(?, key),                                           -- prefixed key
                    json_extract(CAST(${DT_SYS_FIELDS.data} AS JSON), '$.' || key)         -- original value
                    ) AS new_data
                FROM ${dt.SafeName},
                    UNNEST(json_keys(CAST(${DT_SYS_FIELDS.data} AS JSON))) AS t(key)       -- explode top-level keys
                WHERE 
                    json_type(CAST(${DT_SYS_FIELDS.data} AS JSON)) = 'OBJECT'              -- only object rows
                GROUP BY 
                    ${DT_SYS_FIELDS.idx}
                ) AS sub
                WHERE 
                    ${dt.SafeName}.${DT_SYS_FIELDS.idx} = sub.${DT_SYS_FIELDS.idx};
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
			for (const [key, value] of Object.entries(omit(row, [DT_SYS_FIELDS.idx]))) {
				const _unprefixedKey = key.includes(".") ? key.substring(key.indexOf(".") + 1) : key
				__data__[_unprefixedKey] = value
			}
			await dt.RowUpdateByIndex(row.__idx__, __data__)
		}

		await dt.FieldsSet()
		return dt
	}

	@Logger.LogFunction(true)
	static async LeftJoin(dtA: DataTable, dtB: DataTable, leftField: string, rightField: string): Promise<DataTable> {
		const conn = await dtA.DuckConnection()

		// Create result table
		const resultTable = `result`
		await conn.run(duckDb_Sql_DropTable(resultTable))

		// Create temporary table for dtB rows
		await conn.run(duckDb_Sql_DropTable(dtB.Name))
		await conn.run(duckDb_Sql_CreateTable(dtB.Name))

		// Load dtB rows into temp table
		for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
			await conn.run(
				`
                    INSERT INTO ${dtB.SafeName}
                        (${DT_SYS_FIELDS.data}) 
                    VALUES 
                        (?)`,
				[JsonUtils.Stringify(row)],
			)
		}

		// Perform left join with temp table
		await conn.run(`
                CREATE TABLE ${resultTable} AS
                    SELECT 
                        l.${DT_SYS_FIELDS.seq},
                        l.${DT_SYS_FIELDS.idx},
                        CAST(
                            CASE 
                            WHEN r.${DT_SYS_FIELDS.data} IS NULL THEN l.${DT_SYS_FIELDS.data}
                            ELSE json_merge_patch(
                                CAST(l.${DT_SYS_FIELDS.data} AS JSON),
                                CAST(r.${DT_SYS_FIELDS.data} AS JSON)
                            )
                            END 
                        AS VARCHAR) as ${DT_SYS_FIELDS.data},
                        l.${DT_SYS_FIELDS.created_at},
                        l.${DT_SYS_FIELDS.deleted}
                    FROM 
                        ${dtA.SafeName} l
                    LEFT JOIN 
                        ${dtB.SafeName} r
                    ON 
                        json_extract(CAST(l.${DT_SYS_FIELDS.data} AS JSON), '$.${leftField}') = json_extract(CAST(r.${DT_SYS_FIELDS.data} AS JSON), '$.${rightField}')
                    ORDER BY 
                        l.${DT_SYS_FIELDS.seq}
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
		const conn = await dtA.DuckConnection()

		// Create result table
		const resultTable = `result`
		await conn.run(duckDb_Sql_DropTable(resultTable))

		// Create temporary table for dtB rows
		await conn.run(duckDb_Sql_DropTable(dtB.Name))
		await conn.run(duckDb_Sql_CreateTable(dtB.Name))

		// Load dtB rows into temp table
		for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
			await conn.run(
				`
                    INSERT INTO ${dtB.SafeName}
                        (${DT_SYS_FIELDS.data}) 
                    VALUES 
                        (?)`,
				[JsonUtils.Stringify(row)],
			)
		}

		// Perform inner join with temp table (merge left and right JSON)
		await conn.run(`
                CREATE TABLE ${resultTable} AS
                    SELECT 
                        l.${DT_SYS_FIELDS.seq},
                        l.${DT_SYS_FIELDS.idx},
                        CAST(
                            json_merge_patch(
                                CAST(l.${DT_SYS_FIELDS.data} AS JSON),
                                CAST(r.${DT_SYS_FIELDS.data} AS JSON)
                            ) AS VARCHAR
                        ) as ${DT_SYS_FIELDS.data},
                        l.${DT_SYS_FIELDS.created_at},
                        l.${DT_SYS_FIELDS.deleted}
                    FROM 
                        ${dtA.SafeName} l
                    INNER JOIN 
                        ${dtB.SafeName} r
                    ON 
                        json_extract(CAST(l.${DT_SYS_FIELDS.data} AS JSON), '$.${leftField}') = json_extract(CAST(r.${DT_SYS_FIELDS.data} AS JSON), '$.${rightField}')
                    ORDER BY 
                        l.${DT_SYS_FIELDS.seq}
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
		const conn = await dtA.DuckConnection()

		// Create result table
		const resultTable = `result`
		await conn.run(duckDb_Sql_DropTable(resultTable))

		// Create temporary table for dtB rows
		await conn.run(duckDb_Sql_DropTable(dtB.Name))
		await conn.run(duckDb_Sql_CreateTable(dtB.Name))

		// Load dtB rows into temp table
		for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
			await conn.run(
				`
                    INSERT INTO ${dtB.SafeName}
                        (${DT_SYS_FIELDS.data}) 
                    VALUES 
                        (?)`,
				[JsonUtils.Stringify(row)],
			)
		}

		// Perform right join with temp table (merge right and left JSON)
		await conn.run(`
                CREATE TABLE ${resultTable} AS
                    SELECT 
                        r.${DT_SYS_FIELDS.seq},  -- use right table sequence for ordering
                        r.${DT_SYS_FIELDS.idx},  -- keep right table UUID
                        CAST(
                            CASE 
                            WHEN l.${DT_SYS_FIELDS.data} IS NULL THEN r.${DT_SYS_FIELDS.data}
                            ELSE json_merge_patch(
                                CAST(l.${DT_SYS_FIELDS.data} AS JSON),
                                CAST(r.${DT_SYS_FIELDS.data} AS JSON)
                            )
                            END 
                        AS VARCHAR) as ${DT_SYS_FIELDS.data},
                        COALESCE(r.${DT_SYS_FIELDS.created_at}, l.${DT_SYS_FIELDS.created_at}) as ${DT_SYS_FIELDS.created_at},
                        r.${DT_SYS_FIELDS.deleted}
                    FROM 
                        ${dtB.SafeName} r  -- right table first
                    LEFT JOIN 
                        ${dtA.SafeName} l  -- left table second
                    ON 
                        json_extract(CAST(r.${DT_SYS_FIELDS.data} AS JSON), '$.${rightField}') = json_extract(CAST(l.${DT_SYS_FIELDS.data} AS JSON), '$.${leftField}')
                    ORDER BY 
                        r.${DT_SYS_FIELDS.seq}
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
		const conn = await dtA.DuckConnection()

		// Create result table
		const resultTable = `result`
		await conn.run(duckDb_Sql_DropTable(resultTable))

		// Create temporary table for dtB rows
		await conn.run(duckDb_Sql_DropTable(dtB.Name))
		await conn.run(duckDb_Sql_CreateTable(dtB.Name))

		// Load dtB rows into temp table
		for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
			await conn.run(
				`
                    INSERT INTO ${dtB.SafeName}
                        (${DT_SYS_FIELDS.data}) 
                    VALUES 
                        (?)`,
				[JsonUtils.Stringify(row)],
			)
		}

		// Perform full outer join with temp table
		await conn.run(`
                CREATE TABLE ${resultTable} AS
                    WITH joined AS (
                        SELECT 
                            COALESCE(l.${DT_SYS_FIELDS.seq}, r.${DT_SYS_FIELDS.seq}) as ${DT_SYS_FIELDS.seq},
                            COALESCE(l.${DT_SYS_FIELDS.idx}, r.${DT_SYS_FIELDS.idx}) as ${DT_SYS_FIELDS.idx},
                            CAST(
                                CASE 
                                WHEN l.${DT_SYS_FIELDS.data} IS NULL THEN r.${DT_SYS_FIELDS.data}
                                WHEN r.${DT_SYS_FIELDS.data} IS NULL THEN l.${DT_SYS_FIELDS.data}
                                ELSE json_merge_patch(
                                    CAST(l.${DT_SYS_FIELDS.data} AS JSON),
                                    CAST(r.${DT_SYS_FIELDS.data} AS JSON)
                                )
                                END 
                            AS VARCHAR) as ${DT_SYS_FIELDS.data},
                            COALESCE(l.${DT_SYS_FIELDS.created_at}, r.${DT_SYS_FIELDS.created_at}) as ${DT_SYS_FIELDS.created_at},
                            COALESCE(l.${DT_SYS_FIELDS.deleted}, r.${DT_SYS_FIELDS.deleted}) as ${DT_SYS_FIELDS.deleted}
                        FROM 
                            ${dtA.SafeName} l
                        FULL OUTER JOIN 
                            ${dtB.SafeName} r
                        ON 
                            json_extract(CAST(l.${DT_SYS_FIELDS.data} AS JSON), '$.${leftField}') = json_extract(CAST(r.${DT_SYS_FIELDS.data} AS JSON), '$.${rightField}')
                    )
                    SELECT 
                        *,
                        ROW_NUMBER() OVER (ORDER BY ${DT_SYS_FIELDS.seq}) as new_seq
                    FROM 
                        joined
            `)

		// Fix sequence numbers to be continuous
		await conn.run(`
                UPDATE ${resultTable} 
                SET ${DT_SYS_FIELDS.seq} = new_seq;
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
		const conn = await dtA.DuckConnection()

		// Create result table
		const resultTable = `result`
		await conn.run(duckDb_Sql_DropTable(resultTable))

		// Create temporary table for dtB rows
		await conn.run(duckDb_Sql_DropTable(dtB.Name))
		await conn.run(duckDb_Sql_CreateTable(dtB.Name))

		// Load dtB rows into temp table
		for await (const row of await dtB.RowsIterator({ batchSize: dtA.BatchSize })) {
			await conn.run(
				`
                    INSERT INTO ${dtB.SafeName}
                        (${DT_SYS_FIELDS.data}) 
                    VALUES 
                        (?)`,
				[JsonUtils.Stringify(row)],
			)
		}

		// Perform cross join with temp table
		await conn.run(`
                CREATE TABLE ${resultTable} AS
                    SELECT 
                        ROW_NUMBER() OVER () as ${DT_SYS_FIELDS.seq},    -- new sequential IDs
                        uuidv7() as ${DT_SYS_FIELDS.idx},                -- new UUIDs for crossed rows
                        CAST(
                            json_merge_patch(
                                CAST(l.${DT_SYS_FIELDS.data} AS JSON),
                                CAST(r.${DT_SYS_FIELDS.data} AS JSON)
                            )
                        AS VARCHAR) as ${DT_SYS_FIELDS.data},
                        COALESCE(l.${DT_SYS_FIELDS.created_at}, r.${DT_SYS_FIELDS.created_at}) as ${DT_SYS_FIELDS.created_at},
                        COALESCE(l.${DT_SYS_FIELDS.deleted}, r.${DT_SYS_FIELDS.deleted}) as ${DT_SYS_FIELDS.deleted}
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
		condition: string | undefined = undefined,
	): Promise<DataTable> {
		const conn = await dt.DuckConnection()

		// If no fields specified, use all fields from the first row
		const _fields = fields && fields.length > 0 ? fields : dt.GetFieldNames()

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
			const fieldList = _fields.map((f) => `(${DT_SYS_FIELDS.data}->>'$.${f}')`)
			let orderByClause = ""
			let whereClause = ""
			let methodClause = ""
			switch (strategy) {
				case REMOVE_DUPLICATES_STRATEGY.LAST:
					orderByClause = `ORDER BY ${DT_SYS_FIELDS.seq} DESC`
					break

				case REMOVE_DUPLICATES_STRATEGY.HIGHEST:
				case REMOVE_DUPLICATES_STRATEGY.LOWEST: {
					if (!condition || condition.trim() === "") {
						// If no condition given, fallback to seq ordering
						orderByClause = `ORDER BY ${DT_SYS_FIELDS.seq} ASC`
						break
					}

					// Normalization expression: tries numeric conversion, maps textual booleans to numbers, otherwise NULL
					const valueNormExpr = `
                        CASE
                            WHEN TRY_CAST(${DT_SYS_FIELDS.data}->>'$.${condition}' AS DOUBLE) IS NOT NULL
                                THEN TRY_CAST(${DT_SYS_FIELDS.data}->>'$.${condition}' AS DOUBLE)
                            WHEN LOWER(${DT_SYS_FIELDS.data}->>'$.${condition}') = 'true'  THEN 1.0
                            WHEN LOWER(${DT_SYS_FIELDS.data}->>'$.${condition}') = 'false' THEN 0.0
                            ELSE NULL
                        END`.replaceAll(/\s+/g, " ") // remove excessive whitespace for readability in SQL

					// A small helper: prefer rows with a defined value (0) before undefined (1)
					const definedFirstExpr = `
                        CASE
                            WHEN TRY_CAST(${DT_SYS_FIELDS.data}->>'$.${condition}' AS DOUBLE) IS NOT NULL THEN 0
                            WHEN LOWER(${DT_SYS_FIELDS.data}->>'$.${condition}') IN ('true','false') THEN 0
                            ELSE 1
                        END`.replaceAll(/\s+/g, " ")

					if (strategy === REMOVE_DUPLICATES_STRATEGY.HIGHEST) {
						// prefer defined rows, then highest normalized value
						orderByClause = `ORDER BY ${definedFirstExpr}, (${valueNormExpr}) DESC, ${DT_SYS_FIELDS.seq} ASC`
					} else {
						// LOWEST
						// prefer defined rows, then lowest normalized value
						orderByClause = `ORDER BY ${definedFirstExpr}, (${valueNormExpr}) ASC, ${DT_SYS_FIELDS.seq} ASC`
					}
					break
				}
				case REMOVE_DUPLICATES_STRATEGY.CUSTOM:
					whereClause = `CASE WHEN ${dataTable_convertSql(condition)} THEN 0 ELSE 1 END`
					orderByClause = `ORDER BY ${whereClause}, ${DT_SYS_FIELDS.seq} ASC` // Default order for custom strategy
					break
				default:
					orderByClause = `ORDER BY ${DT_SYS_FIELDS.seq} ASC`
					break
			}

			// Handle different deduplication methods
			switch (method) {
				case REMOVE_DUPLICATES_METHOD.IGNORE_CASE:
					methodClause = fieldList.map((f) => `LOWER(${f})`).join(", ")
					break
				default:
					methodClause = fieldList.join(", ")
					break
			}

			const dedupQuery = `
                INSERT INTO ${tempTableName}(${DT_SYS_FIELDS.data})
                SELECT ${DT_SYS_FIELDS.data} FROM ${dt.SafeName}
                QUALIFY ROW_NUMBER() OVER (
                    PARTITION BY ${methodClause}
                    ${orderByClause}
                ) = 1
                ORDER BY ${DT_SYS_FIELDS.seq} ASC
                `

			// Execute the deduplication
			await conn.run(dedupQuery)

			// Replace the original table with the deduplicated data
			await conn.run(`DELETE FROM ${dt.SafeName}`)
			await conn.run(
				`INSERT INTO ${dt.SafeName}(${DT_SYS_FIELDS.data}) SELECT ${DT_SYS_FIELDS.data} FROM ${tempTableName}`,
			)
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
	static async Anonymize(dt: DataTable, fields: string | string[], pseudo: boolean = true): Promise<DataTable> {
		let aFields: string[] =
			typeof fields === "string"
				? fields
						.split(",")
						.map((f) => f.trim())
						.filter(Boolean)
				: fields.map((f) => f.trim())

		if (aFields.length === 1 && aFields[0] === "*") {
			await dt.FieldsSet()
			aFields = dt.GetFieldNames() ?? []
		}

		const cnx = await dt.DuckConnection()

		const anonymizeFnName = "anonymize"

		// Register only the transformation functions (pseudonymize/anonymize)
		try {
			cnx.registerScalarFunction(
				DuckDBScalarFunction.create({
					name: anonymizeFnName,
					parameterTypes: [DataType.VARCHAR],
					returnType: DataType.VARCHAR,
					mainFunction: (_info, input, output) => {
						const inputVector = input.getColumnVector(0)
						const fieldsSet = new Set<string>(aFields) // ✅ Cache field lookup

						for (let i = 0; i < input.rowCount; i++) {
							const rawRow = inputVector.getItem(i)
							if (rawRow === null) {
								output.setItem(i, null)
								continue
							}

							const row: TRow = JsonUtils.TryParse(rawRow as string, {})
							const rowAnonymized = RowUtils.Anonymize(row, fieldsSet, pseudo)

							// Only stringify if modified
							output.setItem(i, JsonUtils.IsEqual(row, rowAnonymized) ? rawRow : JsonUtils.Stringify(rowAnonymized))
						}
						output.flush()
					},
				}),
			)
		} catch (error) {
			Logger.Error(`Error in Anonymize: ${error}`)
		}

		const whereClause =
			aFields.length > 0 ? `WHERE ${aFields.map((f) => `json_exists(${DT_SYS_FIELDS.data}, '${f}')`).join(" OR ")}` : ""

		const sql = `UPDATE 
                    ${dt.SafeName} 
                SET 
                    ${DT_SYS_FIELDS.data} = ${anonymizeFnName}(${DT_SYS_FIELDS.data})
                ${whereClause}`

		Logger.Debug(`DataTableUtils.Anonymize: Executing SQL: ${sql}`)

		// Update the table with the anonymized rows
		await cnx.run(sql)
		return dt
	}

	@Logger.LogFunction(true)
	static async SyncReport({
		source,
		destination,
		on,
		includeIndex = false,
	}: {
		source: DataTable
		destination: DataTable
		on: string
		includeIndex?: boolean
	}): Promise<TSyncReport> {
		await Promise.all([source.RowsSet(), destination.RowsSet()])

		Assert.Condition(Object.keys(source.Fields).includes(on), `Field ${on} not found in source table`)

		Assert.Condition(
			Object.keys(destination.Fields).includes(on) || (await destination.Count()) === 0,
			`Field ${on} not found in destination table`,
		)

		const conn = await source.DuckConnection()

		const addedName = `added`
		const deletedName = `deleted`
		const updatedName = `updated`

		// Create table for dtDestination rows
		await conn.run(duckDb_Sql_DropTable(destination.Name))
		await conn.run(duckDb_Sql_CreateTable(destination.Name))

		// Load dtDestination rows into temp table
		for await (const row of await destination.RowsIterator({ batchSize: source.BatchSize })) {
			await conn.run(
				`
                INSERT INTO ${destination.SafeName}
                    (${DT_SYS_FIELDS.data}) 
                VALUES 
                    (?)`,
				[JsonUtils.Stringify(row)],
			)
		}

		const sourceName = source.SafeName
		const destinationName = destination.SafeName

		// Get added rows (in source but not in destination)
		await conn.run(duckDb_Sql_DropTable(addedName))
		await conn.run(duckDb_Sql_CreateTable(addedName))

		const addedSql = `
            INSERT INTO ${addedName}
                (${DT_SYS_FIELDS.data}) 
            SELECT
                s.${DT_SYS_FIELDS.data}
            FROM
                ${sourceName} s
            WHERE
                (s.${DT_SYS_FIELDS.data}->'${on}') NOT IN (
                    SELECT (d.${DT_SYS_FIELDS.data}->'${on}')
                    FROM ${destinationName} d
                )
            ;
            SELECT
                *
            FROM
                ${addedName}
            `

		// Get deleted rows (in destination but not in source)
		await conn.run(duckDb_Sql_DropTable(deletedName))
		await conn.run(duckDb_Sql_CreateTable(deletedName))

		const deletedSql = `
            INSERT INTO ${deletedName}
                (${DT_SYS_FIELDS.data}) 
            SELECT
                d.${DT_SYS_FIELDS.data}
            FROM
                ${destinationName} d
            WHERE
                (d.${DT_SYS_FIELDS.data}->'${on}') NOT IN (
                    SELECT (s.${DT_SYS_FIELDS.data}->'${on}')
                    FROM ${sourceName} s
                )
            ;
            SELECT
                *
            FROM
                ${deletedName}
            `

		// Get updated rows (in both but with different content)
		await conn.run(duckDb_Sql_DropTable(updatedName))
		await conn.run(duckDb_Sql_CreateTable(updatedName))

		const updatedSql = `
            INSERT INTO ${updatedName}
                (${DT_SYS_FIELDS.data}) 
            SELECT
                s.${DT_SYS_FIELDS.data}
            FROM
                ${sourceName} s
            WHERE
                s.${DT_SYS_FIELDS.data} != (
                    SELECT d.${DT_SYS_FIELDS.data} 
                    FROM ${destinationName} d
                    WHERE (d.${DT_SYS_FIELDS.data}->'${on}') = (s.${DT_SYS_FIELDS.data}->'${on}')
                )
            ;
            SELECT
                *
            FROM
                ${updatedName}
            `

		try {
			const addedRows = await source._runSqlAndGetRows(addedSql, undefined, { includeIndex })
			const deletedRows = await source._runSqlAndGetRows(deletedSql, undefined, { includeIndex })
			const updatedRows = await source._runSqlAndGetRows(updatedSql, undefined, { includeIndex })

			return {
				AddedRows: addedRows,
				DeletedRows: deletedRows,
				UpdatedRows: updatedRows,
			}
		} catch (error) {
			console.error("Error in SyncReport:", error)
			throw error
		}
	}

	@Logger.LogFunction(true)
	static async SetFromDataTable(target: DataTable, source: DataTable): Promise<DataTable> {
		const sourceConn = await source.DuckConnection()
		const targetConn = await target.DuckConnection()

		// Use a temp file for transfer to avoid memory pressure
		const tempFile = StringUtils.FsPath(DataTable.Path, `${randomUUID()}.parquet`)

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
                INSERT INTO 
					${target.SafeName}
                SELECT 
					*
				FROM 
					read_parquet('${tempFile}')
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
	//     const conn = this.DuckConnection()
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
