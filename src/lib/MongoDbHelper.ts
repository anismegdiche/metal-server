//
//
//
//
//
import { SORT_ORDER } from "../types/DataTable"
import { Logger } from "../utils/Logger"
import { SQLParser } from 'sql-in-mongodb'


// eslint-disable-next-line @typescript-eslint/no-require-imports
//XXX const { getMongoQuery } = require("sql2mongo")

export class MongoDbHelper {

    static readonly WhereParser = new SQLParser()

    @Logger.LogFunction()
    static ConvertSqlSort(key: any, value: string) {
        const aSort = value.split(" ")

        if (aSort.length != 2)
            return {}

        const [field, sqlSortDirection] = aSort

        return {
            ...key,
            [field]: (sqlSortDirection.toLowerCase() == SORT_ORDER.ASC)
                ? 1
                : -1
        }
    }

    @Logger.LogFunction()
    static ConvertSqlQuery(sqlQuery: string) {
        return this.WhereParser.parseSql(`WHERE ${sqlQuery}`)
    }
}