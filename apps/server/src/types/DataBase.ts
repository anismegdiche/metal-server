//
//
//
import { type DuckDBConnection, DuckDBInstance, type DuckDBValue } from "@duckdb/node-api"
import { Logger } from "@metal/logger"
import type { TAny, TJson } from "@metal/types"
import { StringUtils } from "@metal/utils"
//
import { Assert } from "../utils/Assert"
import { Utils } from "../utils/Utils"
import { DataTable, dataTable_convertSql, type TRow } from "./DataTable"

//
export class DataBase {
	Name: string
	Tables: Record<string, DataTable> = {}
	_duckInstance?: DuckDBInstance
	_dbPath: string
	_encryptionKey?: string

	constructor(name: string, isPersistent?: boolean) {
		Assert.Var<string>(name, "undefined DataBase name")
		this.Name = name
		this._dbPath =
			isPersistent === true ? StringUtils.FsPath(DataTable.Path, `${this.Name}_${Utils.Uuid(true)}.db`) : ":memory:"

		// Generate encryption key for persistent databases
		if (isPersistent === true) {
			this._encryptionKey = Utils.Uuid()
		}
	}

	async Init() {
		this._duckInstance = await DuckDBInstance.create(this._dbPath)
	}

	async Disconnect() {
		if (this._duckInstance) {
			try {
				this._duckInstance.closeSync()
			} catch (e) {
				Logger.Error(`DataBase.Disconnect: Error closing DuckDB instance for '${this.Name}': ${e}`)
			}
			this._duckInstance = undefined
		}
		for (const table of Object.values(this.Tables)) {
			table.Dispose()
		}
		this.Tables = {}
	}

	@Logger.LogFunction()
	AddTable(entity: string, rows?: TRow[] | TJson[]) {
		Assert.Var(entity, "undefined DataTable name")
		if (this.Tables[entity] === undefined)
			this.Tables[entity] = new DataTable(entity, rows, undefined, { duckInstance: this._duckInstance })
		else Logger.Error(`DataBase '${this.Name}' has already entity named '${entity}'`)
	}

	@Logger.LogFunction()
	async SetTable(entity: string, rows?: TRow[] | TJson[]) {
		Assert.Var(entity, "undefined DataTable name")
		if (this.Tables[entity] === undefined) this.AddTable(entity, rows)
		else this.Tables[entity].RowsSet(rows)
	}

	@Logger.LogFunction()
	async FreeSql({
		entity,
		sqlQuery,
		queryParams,
		returnData = false,
		convertCondition = true,
	}: {
		entity?: string
		sqlQuery?: string
		queryParams?: TAny[]
		returnData?: boolean
		convertCondition?: boolean
	} = {}): Promise<DataTable | this> {
		Assert.Var<string>(entity, "undefined DataTable name")
		Assert.Var<string>(sqlQuery, "undefined SQL query")

		const data = Assert.Get<DataTable>(this.Tables[entity], `entity ${entity} do not exist`)
		const cnx = Assert.Get<DuckDBConnection>(await data.DuckConnection(), `connection is not set for ${entity}`)

		const _sql = convertCondition ? dataTable_convertSql(sqlQuery) : sqlQuery

		if (returnData) {
			const result = new DataTable(
				this.Name,
				await data._runSqlAndGetRows(_sql, queryParams).catch((err) => {
					Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
					throw new Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
				}),
			)
			return result.FieldsSet()
		}

		await cnx.run(_sql, queryParams as DuckDBValue[]).catch((err) => {
			Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
			throw new Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
		})

		return this
	}
}
