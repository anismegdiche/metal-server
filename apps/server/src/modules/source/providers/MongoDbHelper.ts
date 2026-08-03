//
//
//
const SQLParser = require("@synatic/noql")

import { Logger } from "@metal/logger"
import type { TJson } from "@metal/types"
//
import { JsonUtils } from "@metal/utils"
import { Assert } from "../../../utils/Assert"
import type { TSqlToken } from "../../../utils/SqlQueryUtils"
import { SQL_TYPE, SqlQueryUtils } from "../../../utils/SqlQueryUtils"
import { NormalizeError } from "../../errors/HttpErrors"

//
export class MongoDbHelper {
	@Logger.LogFunction()
	static ParseSqlQuery(sqlQuery: string | undefined): TJson<any> {
		let mongoParsedQuery: TJson<any> = {}

		try {
			mongoParsedQuery = SQLParser.parseSQL(sqlQuery)
		} catch (err: unknown) {
			Logger.Error(`MongoDbHelper.ParseSqlQuery: Error parsing SQL query: ${sqlQuery}\r\n${NormalizeError(err).message}`)
		}

		mongoParsedQuery = JsonUtils.ReplaceStrings(mongoParsedQuery, /%/g, ".*")

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

		if (mongoParsedQuery.aggregate.length === 0) {
			delete mongoParsedQuery.aggregate
		}

		return {
			query: {},
			pipeline: {},
			...mongoParsedQuery,
		}
	}

	static getOperatorPrecedence(operator: string): number {
		// Helper function to get operator precedence
		switch (operator) {
			case "*":
			case "/":
				return 2
			case "+":
			case "-":
				return 1
			default:
				return 0
		}
	}

	// Helper function to convert arithmetic operator to MongoDB operator
	static getMongoOperator(operator: string): string {
		const operatorMap: Record<string, string> = {
			"+": "$add",
			"-": "$subtract",
			"*": "$multiply",
			"/": "$divide",
		}

		Assert.Var<string>(operatorMap[operator], `operator ${operator} is not supported`)

		return operatorMap[operator]
	}

	static evaluateExpressionNumber(tokens: TSqlToken[]): any {
		if (tokens.length === 0) return null

		let firstToken = tokens[0]

		Assert.Var<TSqlToken>(firstToken, "firstToken is undefined")

		if (tokens.length === 1) {
			if (firstToken.type === SQL_TYPE.NUMBER) return Number(firstToken.token)
			if (firstToken.type === SQL_TYPE.VARIABLE) return `$${firstToken.token}`
			return null
		}

		// First handle multiplication and division
		let i = 1
		while (i < tokens.length - 1) {
			const token = tokens[i]

			Assert.Var<TSqlToken>(token, "token is undefined")

			if (token.type === SQL_TYPE.OPERATOR && (token.token === "*" || token.token === "/")) {
				const left = tokens[i - 1]
				const right = tokens[i + 1]

				Assert.Var<TSqlToken>(left, "left is undefined")
				Assert.Var<TSqlToken>(right, "right is undefined")

				const operator = MongoDbHelper.getMongoOperator(token.token)

				const leftValue = left.type === SQL_TYPE.NUMBER ? Number(left.token) : `$${left.token}`

				const rightValue = right.type === SQL_TYPE.NUMBER ? Number(right.token) : `$${right.token}`

				const _type = left.type === SQL_TYPE.NUMBER && right.type === SQL_TYPE.NUMBER ? SQL_TYPE.NUMBER : SQL_TYPE.STRING

				// Replace these three tokens with the result
				tokens.splice(i - 1, 3, {
					token: JSON.stringify({ [operator]: [leftValue, rightValue] }),
					type: _type,
					context: token.context,
				})
				i--
			}
			i++
		}

		// Then handle addition and subtraction
		const finalOperands: any[] = []
		const currentOperator = "$add"

		firstToken = tokens[0]
		Assert.Var<TSqlToken>(firstToken, "firstToken is undefined")

		// Handle first token
		if (firstToken.type === SQL_TYPE.NUMBER) {
			finalOperands.push(Number(firstToken.token))
		} else if (firstToken.type === SQL_TYPE.VARIABLE) {
			finalOperands.push(`$${firstToken.token}`)
		} else if (firstToken.token.startsWith("{")) {
			finalOperands.push(JSON.parse(firstToken.token))
		}

		// Process the rest
		for (let i = 1; i < tokens.length; i += 2) {
			const operator = tokens[i]
			const value = tokens[i + 1]

			Assert.Var<TSqlToken>(operator, "operator is undefined")
			Assert.Var<TSqlToken>(value, "value is undefined")

			if (operator.type === SQL_TYPE.OPERATOR) {
				if (value.token.startsWith("{")) {
					finalOperands.push(JSON.parse(value.token))
				} else if (value.type === SQL_TYPE.NUMBER) {
					finalOperands.push(Number(value.token))
				} else if (value.type === SQL_TYPE.VARIABLE) {
					finalOperands.push(`$${value.token}`)
				} else {
					finalOperands.push(`${value.token}`)
				}
			}
		}

		if (finalOperands.length === 1) return finalOperands[0]
		return { [currentOperator]: finalOperands }
	}

	// Process parentheses first
	static processParenthesesNumber(tokens: TSqlToken[]): TSqlToken[] {
		const result: TSqlToken[] = []
		let i = 0

		while (i < tokens.length) {
			const currentToken = tokens[i]
			Assert.Var<TSqlToken>(currentToken, "currentToken is undefined")

			if (currentToken.type === SQL_TYPE.PAR_OPEN) {
				let parenthesesCount = 1
				let j = i + 1
				const innerTokens: TSqlToken[] = []

				const nextToken = tokens[j]
				Assert.Var<TSqlToken>(nextToken, "nextToken is undefined")

				while (j < tokens.length && parenthesesCount > 0) {
					if (nextToken.type === SQL_TYPE.PAR_OPEN) parenthesesCount++
					if (nextToken.type === SQL_TYPE.PAR_CLOSED) parenthesesCount--
					if (parenthesesCount > 0) {
						innerTokens.push(nextToken)
					}
					j++
				}

				const evaluatedInner = MongoDbHelper.evaluateExpressionNumber(innerTokens)
				result.push({
					token: JSON.stringify(evaluatedInner),
					type: SQL_TYPE.NUMBER,
					context: currentToken.context,
				})
				i = j
			} else {
				result.push(currentToken)
				i++
			}
		}

		return result
	}

	static ConvertSqlUpdateSet(data: TJson): TJson {
		let $set: TJson = {}
		Object.entries(data).forEach(([key, value]) => {
			const sqlHelper = new SqlQueryUtils(value as string)
			const tokens = sqlHelper.Tokenize()
			const $setClause = tokens.some((token) => token.type === SQL_TYPE.STRING)
				? MongoDbHelper.ConvertSqlUpdateSetString(tokens, key)
				: MongoDbHelper.ConvertSqlUpdateSetNumber(tokens, key)
			$set = {
				...$set,
				...$setClause,
			}
		})
		return { $set }
	}

	static ConvertSqlUpdateSetNumber(tokens: TSqlToken[], fieldName: string): TJson {
		const processedTokens = MongoDbHelper.processParenthesesNumber(tokens)
		const result = MongoDbHelper.evaluateExpressionNumber(processedTokens)
		return { [fieldName]: result }
	}

	static evaluateExpressionString(tokens: TSqlToken[]): any {
		if (tokens.length === 0) return null

		const firstToken = tokens[0]

		Assert.Var<TSqlToken>(firstToken, "firstToken is undefined")

		if (tokens.length === 1) {
			if (firstToken.type === SQL_TYPE.STRING) return firstToken.token.replaceAll(/^'|'$/g, "") // Remove surrounding quotes
			if (firstToken.type === SQL_TYPE.VARIABLE) return `$${firstToken.token}`
			return null
		}

		const operands: any[] = []

		// Handle first token
		if (firstToken.type === SQL_TYPE.STRING) {
			operands.push(firstToken.token.replaceAll(/^'|'$/g, ""))
		} else if (firstToken.type === SQL_TYPE.VARIABLE) {
			operands.push(`$${firstToken.token}`)
		} else if (firstToken.token.startsWith("{")) {
			operands.push(JSON.parse(firstToken.token))
		}

		// Process the rest
		for (let i = 1; i < tokens.length; i += 2) {
			const value = tokens[i + 1]

			Assert.Var<TSqlToken>(value, "value is undefined")

			if (value.token.startsWith("{")) {
				operands.push(JSON.parse(value.token))
			} else if (value.type === SQL_TYPE.STRING) {
				operands.push(value.token.replaceAll(/^'|'$/g, ""))
			} else if (value.type === SQL_TYPE.VARIABLE) {
				operands.push(`$${value.token}`)
			}
		}

		if (operands.length === 1) return operands[0]
		return { $concat: operands }
	}

	// Process parentheses first
	static processParenthesesString(tokens: TSqlToken[]): TSqlToken[] {
		const result: TSqlToken[] = []
		let i = 0

		while (i < tokens.length) {
			const currentToken = tokens[i]
			Assert.Var<TSqlToken>(currentToken, "currentToken is undefined")

			if (currentToken.type === SQL_TYPE.PAR_OPEN) {
				let parenthesesCount = 1
				let j = i + 1
				const innerTokens: TSqlToken[] = []

				while (j < tokens.length && parenthesesCount > 0) {
					const nextToken = tokens[j]
					Assert.Var<TSqlToken>(nextToken, "nextToken is undefined")

					if (nextToken.type === SQL_TYPE.PAR_OPEN) parenthesesCount++
					if (nextToken.type === SQL_TYPE.PAR_CLOSED) parenthesesCount--

					if (parenthesesCount > 0) {
						innerTokens.push(nextToken)
					}
					j++
				}

				const evaluatedInner = MongoDbHelper.evaluateExpressionString(innerTokens)
				result.push({
					token: JSON.stringify(evaluatedInner),
					type: SQL_TYPE.STRING,
					context: currentToken.context,
				})
				i = j
			} else {
				result.push(currentToken)
				i++
			}
		}

		return result
	}
	static ConvertSqlUpdateSetString(tokens: TSqlToken[], fieldName: string): TJson {
		const processedTokens = MongoDbHelper.processParenthesesString(tokens)
		const result = MongoDbHelper.evaluateExpressionString(processedTokens)
		return { [fieldName]: result }
	}
}
