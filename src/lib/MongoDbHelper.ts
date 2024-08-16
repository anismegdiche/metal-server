//
//
//
//
//
import { SORT_ORDER } from "../types/DataTable"


// eslint-disable-next-line @typescript-eslint/no-require-imports
const GetMongoQuery = require("sql2mongo").getMongoQuery

export class MongoDbHelper {
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

    static ConvertSqlQuery(sqlQuery: string) {
        return GetMongoQuery(sqlQuery)
    }
}