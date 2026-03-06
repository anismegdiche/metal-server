//
//
//
//

import { Assert } from "../../../utils/Assert"
import { SQL_TYPE, SqlQueryUtils } from "../../../utils/SqlQueryUtils"
import { StringUtils } from "../../../utils/StringUtils"

//
export class CosmosDbHelper {
	static EscapeEntity(_entity: string): string {
		return "c"
	}

	static EscapeField(field: string): string {
		return `c.${field}`
	}

	static ParseSqlQuery(sqlQuery: string | undefined): string {
		Assert.Var<string>(sqlQuery, !StringUtils.IsEmpty(sqlQuery), `Empty SQL Query: ${sqlQuery}`)
		const sqlHelper = new SqlQueryUtils(sqlQuery)
		let sqlTokens = sqlHelper.Tokenize()
		sqlTokens = sqlTokens.map((token) => {
			let _token = token
			if (token.type === SQL_TYPE.FIELD && !token.token.startsWith("c.")) {
				_token = {
					...token,
					token: CosmosDbHelper.EscapeField(token.token),
				}
			}
			if (token.type === SQL_TYPE.VARIABLE && !token.token.startsWith("c.")) {
				_token = {
					...token,
					token: CosmosDbHelper.EscapeField(token.token),
				}
			}
			return _token
		})

		const _sqlQuery = sqlTokens.map((token) => token.token).join(" ")
		return _sqlQuery
	}
}
