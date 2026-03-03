//
//
//
import { DuckDBInstance, type DuckDBValue } from '@duckdb/node-api'
//
import { Assert } from "../utils/Assert"
import { Logger } from '../utils/Logger'
import { StringUtils } from '../utils/StringUtils'
import { Utils } from '../utils/Utils'
import { DataTable, dataTable_convertSql, DATATABLE_TEMP_PATH, type TRow } from './DataTable'
import type { TAny } from './TAny'
import type { TJson } from './TJson'


//
export class DataBase {
    Name: string
    Tables: Record<string, DataTable> = {}
    _duckInstance?: DuckDBInstance
    _dbPath: string

    constructor(name: string, isPersistant?: boolean) {
        Assert.Var(name, "undefined DataBase name")
        this.Name = name
        this._dbPath = isPersistant === true
            ? StringUtils.Path(DATATABLE_TEMP_PATH, `${this.Name}_${Utils.Uuid(true)}.db`)
            : ':memory:'
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
        else
            Logger.Error(`DataBase '${this.Name}' has already entity named '${entity}'`)
    }

    @Logger.LogFunction()
    async SetTable(entity: string, rows?: TRow[] | TJson[]) {
        Assert.Var(entity, "undefined DataTable name")
        if (this.Tables[entity] === undefined)
            this.AddTable(entity, rows)
        else
            this.Tables[entity].RowsSet(rows)
    }

    @Logger.LogFunction()
    async FreeSql(
        {
            entity,
            sqlQuery,
            queryParams,
            returnData = false,
            convertCondition = true
        }: {
            entity?: string,
            sqlQuery?: string,
            queryParams?: TAny[],
            returnData?: boolean,
            convertCondition?: boolean
        } = {}): Promise<DataTable | this> {

        Assert.Var<string>(entity, "undefined DataTable name")
        Assert.Var<string>(sqlQuery, "undefined SQL query")

        await this.Tables[entity]!._dbEnsureInitialized()
        const cnx = this.Tables[entity]!._duckConnection!

        const _sql = convertCondition
            ? dataTable_convertSql(sqlQuery)
            : sqlQuery

        if (returnData) {
            const result = new DataTable(
                this.Name,
                await this.Tables[entity]!._runSqlAndGetRows(_sql, queryParams)
                    .catch((err) => {
                        Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
                        throw new Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
                    })
            )
            await result.FieldsSet()
            return result
        }

        await cnx.run(_sql, queryParams as DuckDBValue[])
            .catch((err) => {
                Logger.Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
                throw new Error(`DataTable.FreeSql: '${this.Name}' Error executing SQL query: '${sqlQuery}': ${err.message}`)
            })

        return this
    }
}