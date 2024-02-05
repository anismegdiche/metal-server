//
//
//
//
//
import _ from 'lodash'
import alasql from 'alasql'
//
import { DataTable, TRow } from './DataTable'
import { TJson } from './TJson'
import { Logger } from '../lib/Logger'


export class DataBase {

    Name: string
    Tables: Record<string, DataTable> = {}

    constructor(name: string) {
        if (name === undefined)
            throw new Error("undefined DataBase name")
        this.Name = name
    }

    AddTable(entityName: string, rows: TJson[] | undefined = undefined) {
        if (this.Tables[entityName] === undefined)
            this.Tables[entityName] = new DataTable(entityName, rows)
        else
            Logger.Error(`DataBase '${this.Name}' has already entity named '${entityName}'`)
    }

    SetTable(entityName: string, rows: TJson[] | undefined = undefined) {
        if (this.Tables[entityName] === undefined)
            this.AddTable(entityName, rows)
        else
            this.Tables[entityName].Set(rows)
    }

    FreeSql(name: string, sqlQuery: string): DataTable | undefined {

        let sqlQueryModified = sqlQuery
        let rows: TRow[][] = []

        const rxDataTableNames = /\{([^}]+)\}/igm
        const dataTables = sqlQuery.match(rxDataTableNames)

        if (dataTables === null)
            return undefined

        _.uniq(dataTables).forEach((_dt: string) => {
            sqlQueryModified = sqlQueryModified.replace(`{${_dt}}`, ` ? ${_dt}`)
            rows = [
                ...rows,
                this.Tables[_dt].Rows
            ]
        })

        return new DataTable(name, alasql(
            sqlQueryModified,
            rows
        ))
    }
}