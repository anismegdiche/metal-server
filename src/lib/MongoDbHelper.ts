//
//
//
//
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GetMongoQuery = require("sql2mongo").getMongoQuery


export class MongoDbHelper {

    static ConvertSqlSort(key: any, value: string) {
        if (value.split(" ").length != 2)
            return {}

        const field = value.split(" ")[0]
        const sqlSortDirection = value.split(" ")[1].toLowerCase()
        const mongoSortDirection = (sqlSortDirection == "asc")
            ? 1
            : -1

        return {
            ...key,
            [field]: mongoSortDirection
        }
    }

    static ConvertSqlQuery(sqlQuery: string) {
        return GetMongoQuery(sqlQuery)
    }
}