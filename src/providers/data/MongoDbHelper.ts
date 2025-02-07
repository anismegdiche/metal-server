/* eslint-disable @typescript-eslint/no-require-imports */
//
//
//
//
//
const SQLParser = require('@synatic/noql')
//
import { JsonHelper } from "../../lib/JsonHelper"
import { TJson } from '../../types/TJson'
import { Logger } from "../../utils/Logger"


//
export class MongoDbHelper {

    @Logger.LogFunction()
    static ParseSqlQuery(sqlQuery: string | undefined): TJson<any> {

        let mongoParsedQuery: TJson<any> = {}
        
        try {
            mongoParsedQuery = SQLParser.parseSQL(sqlQuery)

        } catch (error: any) {
            Logger.Error(`MongoDbHelper.ParseSqlQuery: Error parsing SQL query: ${sqlQuery}\r\n${error.message}`)
        }
        
        mongoParsedQuery = JsonHelper.ReplaceStrings(mongoParsedQuery, /%/g, '.*')

        mongoParsedQuery.aggregate = []

        if (mongoParsedQuery.query) {
            mongoParsedQuery.aggregate.push({ $match: mongoParsedQuery.query })
        }

        if (mongoParsedQuery.projection) {
            mongoParsedQuery.aggregate.push({ $project: mongoParsedQuery.projection })

        }
        if (mongoParsedQuery.sort) {
            mongoParsedQuery.aggregate.push({ $sort: mongoParsedQuery.sort })
        }

        // ROADMAP if (mongoParsedQuery.limit) {
        // ROADMAP     mongoParsedQuery.aggregate.push({ $limit: mongoParsedQuery.limit })
        // ROADMAP } 

        if (mongoParsedQuery.aggregate.length == 0) {
            delete mongoParsedQuery.aggregate
        }

        return {
            query: {},
            pipeline: {},
            ...mongoParsedQuery
        }
    }
}
