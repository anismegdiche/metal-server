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
import { Logger } from '../utils/Logger'
import { HttpErrorInternalServerError } from "../server/HttpErrors"


export class DataBase {

    Name: string
    Tables: Record<string, DataTable> = {}

    constructor(name: string) {
        if (name === undefined)
            throw new HttpErrorInternalServerError("undefined DataBase name")
        this.Name = name
    }

    @Logger.LogFunction()
    AddTable(entity: string, rows: TJson[] | undefined = undefined) {
        if (this.Tables[entity] === undefined)
            this.Tables[entity] = new DataTable(entity, rows)
        else
            Logger.Error(`DataBase '${this.Name}' has already entity named '${entity}'`)
    }

    @Logger.LogFunction()
    SetTable(entity: string, rows: TJson[] | undefined = undefined) {
        if (this.Tables[entity] === undefined)
            this.AddTable(entity, rows)
        else
            this.Tables[entity].Set(rows)
    }

    @Logger.LogFunction()
    FreeSql(name: string, sqlQuery: string): DataTable | undefined {

        let sqlQueryModified = sqlQuery
        let rows: TRow[][] = []

        const rxDataTableNames = /\{([^}]+)\}/igm
        const dataTables = sqlQuery.match(rxDataTableNames)

        if (dataTables === null)
            return undefined

        // eslint-disable-next-line you-dont-need-lodash-underscore/uniq
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