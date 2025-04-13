//
//
//
//
//
import _ from "lodash"
//
import { SqlQueryHelper } from "../../lib/SqlQueryHelper"
import { StringHelper } from "../../lib/StringHelper"
import { Logger } from "../../utils/Logger"
import { CosmosDbData } from "./CosmosDbData"


//
export class CosmosDbHelper {

    // eslint-disable-next-line class-methods-use-this
    static EscapeEntity(entity: string): string {
        return 'c'
    }

    // eslint-disable-next-line class-methods-use-this
    static EscapeField(field: string): string {
        return `c.${field}`
    }

    static ParseSqlQuery(sqlQuery: string | undefined): string {
        Logger.Assert<string>(sqlQuery, !StringHelper.IsEmpty(sqlQuery), `${Logger.Out} Empty SQL Query: ${sqlQuery}`)
        const sqlHelper = new SqlQueryHelper(sqlQuery)
        let sqlTokens = sqlHelper.Tokenize()
        sqlTokens = _.map(sqlTokens, (token) => {
            if (token.type === 'variable' && !token.token.startsWith("c.") && token.token !== "c") {
                return {
                    ...token,
                    token: CosmosDbHelper.EscapeField(token.token)
                }
            }
            return token
        })

        const _sqlQuery = _.map(sqlTokens, (token) => token.token).join(' ')
        return _sqlQuery
    }
}