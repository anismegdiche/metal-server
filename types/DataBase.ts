//
//
//
//
//
import _ from 'lodash'
import alasql from 'alasql'

import { DataTable, TRows } from './DataTable'
import { TJson } from './TJson'
import { Logger } from '../lib/Logger'


export class DataBase {

    public Name: string
    public Tables: Record<string, DataTable> = {}

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

        let _sqlQueryModified = sqlQuery
        let _dtRows: TRows[] = []

        const _rxDataTableNames = /\{([^}]+)\}/igm
        const _dataTables = sqlQuery.match(_rxDataTableNames)

        if (_dataTables === null)
            return undefined

        _.uniq(_dataTables).forEach((__dt: string) => {
            _sqlQueryModified = _sqlQueryModified.replace(`{${__dt}}`, ` ? ${__dt}`)
            _dtRows = [
                ..._dtRows,
                this.Tables[__dt].Rows
            ]
        })

        return new DataTable(name, alasql(
            _sqlQueryModified,
            _dtRows
        ))
    }
}