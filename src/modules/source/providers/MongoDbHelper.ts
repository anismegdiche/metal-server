 
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
//
//
//
const SQLParser = require('@synatic/noql')
//
import { JsonUtils } from "../../../utils/JsonUtils"
import { SQL_TYPE, SqlQueryUtils, TSqlToken } from "../../../utils/SqlQueryUtils"
import { TJson } from '../../../types/TJson'
import { Logger } from "../../../utils/Logger"


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

        mongoParsedQuery = JsonUtils.ReplaceStrings(mongoParsedQuery, /%/g, '.*')

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

    static getOperatorPrecedence(operator: string): number {
        // Helper function to get operator precedence
        switch (operator) {
            case '*':
            case '/':
                return 2
            case '+':
            case '-':
                return 1
            default:
                return 0
        }
    }


    // Helper function to convert arithmetic operator to MongoDB operator
    static getMongoOperator(operator: string): string {
        const operatorMap: Record<string, string> = {
            '+': '$add',
            '-': '$subtract',
            '*': '$multiply',
            '/': '$divide'
        }
        return operatorMap[operator]
    }

    static evaluateExpressionNumber(tokens: TSqlToken[]): any {
        if (tokens.length === 0) return null
        if (tokens.length === 1) {
            if (tokens[0].type === 'number') return Number(tokens[0].token)
            if (tokens[0].type === 'variable') return `$${tokens[0].token}`
            return null
        }

        // First handle multiplication and division
        let i = 1
        while (i < tokens.length - 1) {
            const token = tokens[i]
            if (token.type === SQL_TYPE.OPERATOR && (token.token === '*' || token.token === '/')) {
                const left = tokens[i - 1]
                const right = tokens[i + 1]
                const operator = MongoDbHelper.getMongoOperator(token.token)

                const leftValue = left.type === SQL_TYPE.NUMBER
                    ? Number(left.token)
                    : `$${left.token}`

                const rightValue = right.type === SQL_TYPE.NUMBER
                    ? Number(right.token)
                    : `$${right.token}`

                const _type = left.type === SQL_TYPE.NUMBER && right.type === SQL_TYPE.NUMBER
                    ? SQL_TYPE.NUMBER
                    : SQL_TYPE.STRING

                // Replace these three tokens with the result
                tokens.splice(i - 1, 3, {
                    token: JSON.stringify({ [operator]: [leftValue, rightValue] }),
                    type: _type,
                    context: token.context
                })
                i--
            }
            i++
        }

        // Then handle addition and subtraction
        const finalOperands: any[] = []
        const currentOperator = '$add'

        // Handle first token
        if (tokens[0].type === SQL_TYPE.NUMBER) {
            finalOperands.push(Number(tokens[0].token))
        } else if (tokens[0].type === SQL_TYPE.VARIABLE) {
            finalOperands.push(`$${tokens[0].token}`)
        } else if (tokens[0].token.startsWith('{')) {
            finalOperands.push(JSON.parse(tokens[0].token))
        }

        // Process the rest
        for (let i = 1; i < tokens.length; i += 2) {
            const operator = tokens[i]
            const value = tokens[i + 1]

            if (operator.type === SQL_TYPE.OPERATOR) {
                if (value.token.startsWith('{')) {
                    finalOperands.push(JSON.parse(value.token))
                } else if (value.type === SQL_TYPE.NUMBER) {
                    finalOperands.push(Number(value.token))
                } else if (value.type === SQL_TYPE.VARIABLE) {
                    finalOperands.push(`$${value.token}`)
                } else  {
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
            if (tokens[i].type === SQL_TYPE.PAR_OPEN) {
                let parenthesesCount = 1
                let j = i + 1
                const innerTokens: TSqlToken[] = []

                while (j < tokens.length && parenthesesCount > 0) {
                    if (tokens[j].type === SQL_TYPE.PAR_OPEN) parenthesesCount++
                    if (tokens[j].type === SQL_TYPE.PAR_CLOSED) parenthesesCount--
                    if (parenthesesCount > 0) {
                        innerTokens.push(tokens[j])
                    }
                    j++
                }

                const evaluatedInner = MongoDbHelper.evaluateExpressionNumber(innerTokens)
                result.push({
                    token: JSON.stringify(evaluatedInner),
                    type: SQL_TYPE.NUMBER,
                    context: tokens[i].context
                })
                i = j
            } else {
                result.push(tokens[i])
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
            const $setClause = tokens.some(token => token.type === 'string')
                ? MongoDbHelper.ConvertSqlUpdateSetString(tokens, key)
                : MongoDbHelper.ConvertSqlUpdateSetNumber(tokens, key)
            $set = {
                ...$set,
                ...$setClause
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
        if (tokens.length === 1) {
            if (tokens[0].type === 'string') return tokens[0].token.replace(/^'|'$/g, '') // Remove surrounding quotes
            if (tokens[0].type === 'variable') return `$${tokens[0].token}`
            return null
        }

        const operands: any[] = []

        // Handle first token
        if (tokens[0].type === 'string') {
            operands.push(tokens[0].token.replace(/^'|'$/g, ''))
        } else if (tokens[0].type === 'variable') {
            operands.push(`$${tokens[0].token}`)
        } else if (tokens[0].token.startsWith('{')) {
            operands.push(JSON.parse(tokens[0].token))
        }

        // Process the rest
        for (let i = 1; i < tokens.length; i += 2) {
            const value = tokens[i + 1]

            if (value.token.startsWith('{')) {
                operands.push(JSON.parse(value.token))
            } else if (value.type === 'string') {
                operands.push(value.token.replace(/^'|'$/g, ''))
            } else if (value.type === 'variable') {
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
            if (tokens[i].type === 'par-open') {
                let parenthesesCount = 1
                let j = i + 1
                const innerTokens: TSqlToken[] = []

                while (j < tokens.length && parenthesesCount > 0) {
                    if (tokens[j].type === 'par-open') parenthesesCount++
                    if (tokens[j].type === 'par-closed') parenthesesCount--

                    if (parenthesesCount > 0) {
                        innerTokens.push(tokens[j])
                    }
                    j++
                }

                const evaluatedInner = MongoDbHelper.evaluateExpressionString(innerTokens)
                result.push({
                    token: JSON.stringify(evaluatedInner),
                    type: SQL_TYPE.STRING,
                    context: tokens[i].context
                })
                i = j
            } else {
                result.push(tokens[i])
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