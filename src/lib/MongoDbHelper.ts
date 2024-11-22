//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX import { SORT_ORDER } from "../types/DataTable"
//XXX import { Logger } from "../utils/Logger"
//XXX import { SQLParser } from 'sql-in-mongodb'


//XXX //XXX
//XXX export class MongoDbHelper {

//XXX     static readonly WhereParser = new SQLParser()

//XXX     @Logger.LogFunction()
//XXX     static ConvertSqlSort(key: any, value: string) {
//XXX         const aSort = value.split(" ")

//XXX         if (aSort.length != 2)
//XXX             return {}

//XXX         const [field, sqlSortDirection] = aSort

//XXX         return {
//XXX             ...key,
//XXX             [field]: (sqlSortDirection.toLowerCase() == SORT_ORDER.ASC)
//XXX                 ? 1
//XXX                 : -1
//XXX         }
//XXX     }

//XXX     @Logger.LogFunction()
//XXX     static ConvertSqlQuery(sqlQuery: string) {
//XXX         return this.WhereParser.parseSql(`WHERE ${sqlQuery}`)
//XXX     }
//XXX }