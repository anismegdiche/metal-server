//
//
//
import alasql from 'alasql'
import uniq from 'lodash/uniq'
//
import { DataTable, TRow } from './DataTable'
import { TJson } from './TJson'
import { Logger } from '../utils/Logger'
import { Assert } from "../utils/Assert"

//
export class DataBase {

    Name: string
    Tables: Record<string, DataTable> = {}

    constructor(name: string) {
        Assert.Var(name, "undefined DataBase name")
        this.Name = name
    }

    @Logger.LogFunction()
    AddTable(entity: string, rows?: TRow[] | TJson[]) {
        Assert.Var(entity, "undefined DataTable name")
        if (this.Tables[entity] === undefined)
            this.Tables[entity] = new DataTable(entity, rows)
        else
            Logger.Error(`DataBase '${this.Name}' has already entity named '${entity}'`)
    }

    @Logger.LogFunction()
    SetTable(entity: string, rows?: TRow[] | TJson[]) {
        Assert.Var(entity, "undefined DataTable name")
        if (this.Tables[entity] === undefined)
            this.AddTable(entity, rows)
        else
            this.Tables[entity].SetRows(rows)
    }

    @Logger.LogFunction()
    FreeSql(name: string, sqlQuery: string): DataTable | undefined {
        Assert.Var(name, "undefined DataTable name")
        Assert.Var(sqlQuery, "undefined SQL query")
        let sqlQueryModified = sqlQuery
        let rows: TRow[][] = []

        const rxDataTableNames = /\{([^}]+)\}/igm
        const dataTables = sqlQuery.match(rxDataTableNames)

        if (dataTables === null)
            return undefined


        uniq(dataTables)
            .forEach((_dt: string) => {
                sqlQueryModified = sqlQueryModified.replace(`{${_dt}}`, ` ? ${_dt}`)
                rows = [
                    ...rows,
                    this.Tables[_dt].Rows()
                ]
            })

        return new DataTable(name, alasql(
            sqlQueryModified,
            rows
        ))
    }
}