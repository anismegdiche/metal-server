//
//
//
import { Logger } from "@metal/logger"
import type { TAny } from "@metal/types"
import * as _ from "lodash-es"
//
import { HttpErrorBadRequest, HttpErrorInternalServerError } from "../modules/errors/HttpErrors"
import type { TOrderBy, TRow } from "../types/DataTableTypes"
import { Assert } from "./Assert"

//
export const ESCAPE_FIELD_VALUE = "$>"

export enum SQL_TYPE {
	STRING = "string",
	NUMBER = "number",
	VARIABLE = "variable",
	OPERATOR = "operator",
	PAR_OPEN = "par-open",
	PAR_CLOSED = "par-closed",
	SEPARATOR = "separator",
	COMMAND = "command",
	ERROR = "error",
	TERMINATOR = "terminator",
	COMMENT = "comment",
	KEYWORD = "keyword",
	WILDCARD = "wildcard",
	ENTITY = "entity",
	FIELD = "field",
	FUNCTION = "function",
}

export const SQL_COMMANDS = [
	"SELECT",
	"INSERT",
	"UPDATE",
	"DELETE",
	"CREATE",
	"ALTER",
	"DROP",
	"TRUNCATE",
	"RENAME",
	"COMMIT",
	"ROLLBACK",
	"SAVEPOINT",
	"SET",
	"FROM",
	"WHERE",
	"GROUP",
	"HAVING",
	"ORDER",
	"BY",
	"ASC",
	"DESC",
	"LIMIT",
	"OFFSET",
	"VALUES",
	"INTO",
]

export const SQL_KEYWORDS = [
	"NOT",
	"AND",
	"OR",
	"IN",
	"BETWEEN",
	"IS",
	"NULL",
	"JOIN",
	"INNER",
	"LEFT",
	"RIGHT",
	"FULL",
	"OUTER",
	"ON",
	"AS",
	"DISTINCT",
	"UNION",
	"ALL",
	"EXISTS",
	"CASE",
	"WHEN",
	"THEN",
	"ELSE",
	"END",
	"LIKE",
	"PRIMARY",
	"KEY",
	"FOREIGN",
	"REFERENCES",
	"DEFAULT",
	"CHECK",
	"INDEX",
	"VIEW",
	"DATABASE",
	"TABLE",
]

export const SQL_OPERATORS = ["+", "-", "*", "/", "=", "<", ">", "<=", ">=", "<>", "!=", "LIKE"]

export const SQL_COMMENT_MARKERS = ["#", "--", "/*", "*/", "//"]

export const SQL_PUNCTUATION = {
	PAR_OPEN: "(",
	PAR_CLOSED: ")",
	TERMINATOR: ";",
	SEPARATOR: ",",
}

//
export type TSqlToken = {
	token: string
	type: SQL_TYPE
	context: string
}

//
export class SqlQueryUtils {
	QueryParams: TAny[] = []

	_query: string = ""
	_fnEscapeEntity: (entity: string) => string = (entity: string) => entity
	_fnEscapeField: (field: string) => string = (field: string) => field

	constructor(query?: string, fnEscapeEntity?: (entity: string) => string, fnEscapeField?: (field: string) => string) {
		if (query) this.SetQuery(query)

		if (fnEscapeEntity) this._fnEscapeEntity = fnEscapeEntity

		if (fnEscapeField) this._fnEscapeField = fnEscapeField
	}

	_whereCondition(field: string, value: unknown): string {
		// file deepcode ignore DuplicateCaseSwitch: simplicity
		switch (true) {
			case typeof value === "string":
				return `${field} = '${value}'`

			case value === null:
				return `${field} = NULL`

			case value === undefined:
				throw new HttpErrorInternalServerError(`SqlQueryHelper.Where: undefined value for field '${field}'`)
			default:
				return `${field} = ${value}`
		}
	}

	_escapeFields(fields?: string[]): string {
		if (!fields || fields.length === 0) return ""

		return _.chain(fields)
			.map((field) => field.trim())
			.map(this._fnEscapeField)
			.join(", ")
			.value()
			.trim()
	}

	_formatValue(value: any): string | undefined {
		switch (true) {
			case value === undefined:
			case value === null:
				return "NULL" // Use literal NULL for nullish values

			case typeof value === "string" && value.startsWith(ESCAPE_FIELD_VALUE):
				// If you have a special marker to escape raw value, return raw without parameterizing
				return value.slice(ESCAPE_FIELD_VALUE.length).trim()

			default:
				// For all other cases, including strings, numbers, and objects,
				// push the value as a parameter and return the placeholder
				this.QueryParams.push(value)
				return "?"
		}
	}

	_sanitizeTokenize(): string[] {
		const query = this._query.trim()
		if (/^\d+(\.\d+)?$/.test(query)) {
			return [this._query]
		}

		const tokens: string[] = []
		let currentToken = ""
		let inString = false
		let inComment = false
		let stringQuote = ""

		for (let i = 0; i < query.length; i++) {
			const char = query[i]
			const nextChar = query[i + 1]

			// Handle string literals
			if ((char === '"' || char === "'") && !inComment) {
				if (!inString) {
					// Start of string
					inString = true
					stringQuote = char
					currentToken += char
				} else if (char === stringQuote) {
					// Handle escaped quotes inside string
					if (query[i - 1] === "\\") {
						currentToken += char
					} else {
						// End of string
						currentToken += char
						tokens.push(currentToken)
						currentToken = ""
						inString = false
						stringQuote = ""
					}
				} else {
					// Inside a string but not the closing quote
					currentToken += char
				}
				continue
			}

			// If we're inside a string, just add the character
			if (inString) {
				currentToken += char
				continue
			}

			// Handle comments
			if (char === "-" && nextChar === "-" && !inComment) {
				if (currentToken.trim()) {
					tokens.push(currentToken.trim())
					currentToken = ""
				}
				inComment = true
				continue
			}

			if (inComment) {
				if (char === "\n" || i === query.length - 1) {
					inComment = false
				}
				continue
			}

			Assert.Var<string>(char, "char is undefined")

			// Handle special characters that should be separate tokens
			if (/[(),;=<>!+\-*/%]/.test(char)) {
				if (currentToken.trim()) {
					tokens.push(currentToken.trim())
					currentToken = ""
				}
				// Handle multi-character operators (<=, >=, <>, !=, ==)
				if (nextChar && /[=<>!]/.test(char) && /[=<>]/.test(nextChar)) {
					tokens.push(char + nextChar)
					i++ // Skip next character since we've processed it
				} else {
					tokens.push(char)
				}
				continue
			}

			// Handle whitespace
			if (/\s/.test(char)) {
				if (currentToken.trim()) {
					tokens.push(currentToken.trim())
					currentToken = ""
				}
				continue
			}

			// Add character to current token
			currentToken += char
		}

		// Add the last token if it exists
		if (currentToken.trim()) {
			tokens.push(currentToken.trim())
		}

		// Filter out empty tokens
		return tokens.filter((token) => token.length > 0)
	}

	_detectSqlInjection() {
		const DENY_WORDS = [
			"DROP",
			"ALTER",
			"EXEC",
			"EXECUTE",
			"DECLARE",
			"CAST",
			"CONVERT",
			"UNION",
			"TABLE",
			"PROCEDURE",
			"FUNCTION",
			"TRUNCATE",
			"RENAME",
			"SHUTDOWN",
			"CREATE",
			"GRANT",
			"REVOKE",
			"DENY",
			"WAITFOR",
			"SLEEP",
			"PG_SLEEP",
			"BENCHMARK",
			"xp_cmdshell",
			"sp_",
			"fn_",
			"sys.",
			"information_schema.",
			"pg_catalog.",
		]

		const RX_SQL_INJECTION = [
			/(--|#|\/\*)/i, // Comments like --, #, /*
			/(;|\|\|)/i, // SQL operators like OR, AND, ;
		]

		// Detect all CRUD combinations in the same query
		const RX_MIXED_CRUD = [
			/\bSELECT\b.*\bSELECT\b/i, // SELECT + SELECT
			/\bSELECT\b.*\bINSERT\b|\bINSERT\b.*\bSELECT\b/i, // SELECT + INSERT
			/\bSELECT\b.*\bUPDATE\b|\bUPDATE\b.*\bSELECT\b/i, // SELECT + UPDATE
			/\bSELECT\b.*\bDELETE\b|\bDELETE\b.*\bSELECT\b/i, // SELECT + DELETE
			/\bINSERT\b.*\bUPDATE\b|\bUPDATE\b.*\bINSERT\b/i, // INSERT + UPDATE
			/\bINSERT\b.*\bDELETE\b|\bDELETE\b.*\bINSERT\b/i, // INSERT + DELETE
			/\bUPDATE\b.*\bDELETE\b|\bDELETE\b.*\bUPDATE\b/i, // UPDATE + DELETE
			// All four CRUD operations together
			/\bSELECT\b.*\bINSERT\b.*\bUPDATE\b.*\bDELETE\b|\bDELETE\b.*\bUPDATE\b.*\bINSERT\b.*\bSELECT\b/i,
		]

		const tokens = this.Tokenize()
		const _tokensWithoutString = tokens.filter((token) => token.type !== SQL_TYPE.STRING && token.type !== SQL_TYPE.ERROR)
		const _tokensWithErrors = tokens.filter((token) => token.type === SQL_TYPE.ERROR)

		// check for errors in tokens
		if (_tokensWithErrors.length > 0) return true

		// check for deny words
		if (_tokensWithoutString.some((token) => DENY_WORDS.includes(token.token.toUpperCase()))) return true

		// for each token in  _tokensWithoutString check if RX_SQL_INJECTION
		if (_tokensWithoutString.some((token) => RX_SQL_INJECTION.some((pattern) => pattern.test(token.token)))) return true

		// for each token in  _tokensWithoutString check if RX_MIXED_CRUD
		if (_tokensWithoutString.some((token) => RX_MIXED_CRUD.some((pattern) => pattern.test(token.token)))) return true

		if (this._hasLiteralEquality(tokens)) return true

		return (
			// RX_SQL_INJECTION.some(pattern => pattern.test(this._query)) ||
			RX_MIXED_CRUD.some((pattern) => pattern.test(this._query.toUpperCase()))
		)
	}

	_hasLiteralEquality(tokens: TSqlToken[]) {
		for (let i = 0; i <= tokens.length - 3; i++) {
			const a = tokens[i]
			const b = tokens[i + 1]
			const c = tokens[i + 2]

			Assert.Var<TSqlToken>(a, "a is undefined")
			Assert.Var<TSqlToken>(b, "b is undefined")
			Assert.Var<TSqlToken>(c, "c is undefined")

			if (b.type === "operator" && b.token === "=") {
				if (a.type === "string" && c.type === "string") return true
				if (a.type === "number" && c.type === "number") return true
			}
		}
		return false
	}

	@Logger.LogFunction(true)
	SetQuery(query: string): this {
		this._query = String(query)
		return this
	}

	Query(): string {
		if (this._detectSqlInjection()) 
			throw new HttpErrorBadRequest("SQL Injection detected")

		return this._query
	}

	@Logger.LogFunction(true)
	Select(fields?: string[]): this {
		this._query = fields === undefined || fields.join("") === "*" ? `SELECT *` : `SELECT ${this._escapeFields(fields)}`

		return this
	}

	@Logger.LogFunction(true)
	From(entity: string): this {
		this._query = `${this._query} FROM ${this._fnEscapeEntity(entity)}`
		return this
	}

	@Logger.LogFunction(true)
	Where(condition?: string | object): this {
		// no filters
		if (condition === undefined) return this

		// filter-expression
		if (typeof condition === "string" && condition.length > 0) {
			this._query = `${this._query} WHERE ${condition}`
			return this
		}

		// filter
		if (Array.isArray(condition) && condition.length > 0) {
			const _cond = _.chain(condition)
				.map((__filter) => {
					const [___field] = Object.keys(__filter)
					const [___value] = Object.values(__filter)

					if (!___field) return ""

					return this._whereCondition(this._fnEscapeField(___field), ___value)
				})
				.join(" AND ")
				.value()

			this._query = `${this._query} WHERE ${_cond}`
			return this
		}

		if (typeof condition === "object" && _.keys(condition).length > 0) {
			const _cond = _.chain(condition)
				.map((__value, __field) => {
					if (!__field) return ""

					return this._whereCondition(this._fnEscapeField(__field), __value)
				})
				.join(" AND ")
				.value()

			this._query = `${this._query} WHERE ${_cond}`
			return this
		}
		return this
	}

	@Logger.LogFunction(true)
	Delete(): this {
		this._query = "DELETE"
		return this
	}

	@Logger.LogFunction(true)
	Update(entity: string): this {
		this._query = `UPDATE ${this._fnEscapeEntity(entity)}`
		return this
	}

	@Logger.LogFunction(true)
	Set(rows?: TRow[] | TRow): this {
		if (rows === undefined) return this

		let fieldsValues: TRow | undefined = {}
		fieldsValues = Array.isArray(rows) ? rows[0] : rows

		Assert.Var<TRow>(fieldsValues, "fieldsValues is undefined")

		const setValues = _.chain(fieldsValues)
			.mapValues((_value, _field) => {
				const formattedValue = this._formatValue(_value)
				return formattedValue === undefined ? "" : `${_field} = ${formattedValue}`
			})
			.values()
			.filter(Boolean)
			.join(", ")
			.value()

		if (setValues) {
			this._query = `${this._query} SET ${setValues}`.trim()
		}
		return this
	}

	@Logger.LogFunction(true)
	Insert(entity: string): this {
		this._query = `INSERT INTO ${this._fnEscapeEntity(entity)}`
		return this
	}

	@Logger.LogFunction(true)
	Fields(fields?: string[]): this {
		if (!fields) return this

		this._query = `${this._query}(${this._escapeFields(fields)})`

		return this
	}

	@Logger.LogFunction(true)
	Values(data: TRow[]): this {
		if (Array.isArray(data) && data.length > 0) {
			this._query = `${this._query} VALUES`
			data.forEach((_values, _index) => {
				const newValues = _.chain(_values)
					.mapValues((_value) => this._formatValue(_value))
					.values()
					.filter((val): val is string => val !== undefined)
					.join(", ")
					.value()

				this._query = `${this._query} (${newValues.trim()})`
				// multiple value join
				if (_index < data.length - 1) {
					this._query = `${this._query}, `
				}
			})
		} else if (data && typeof data === "object") {
			const values = _.values(data)
				.map((_value) => this._formatValue(_value))
				.filter((_value): _value is string => _value !== undefined)
				.join(",")
			this._query = `${this._query} VALUES (${values})`
		}
		return this
	}

	@Logger.LogFunction(true)
	OrderBy(order?: TOrderBy): this {
		if (!order) return this

		const _order = _.map(order, (value, key) => `${key} ${value?.toUpperCase()}`)
		this._query = `${this._query} ORDER BY ${_order.join(", ")}`
		return this
	}

	Tokenize(): TSqlToken[] {
		const sanitizedTokens = this._sanitizeTokenize()

		// default=WHERE case of only condition is passed
		let context = "WHERE"
		let isInsertFields = false

		const tokens = _.chain(sanitizedTokens)
			.map((token: string, _index: number) => {
				const upperToken = token.toUpperCase()
				let type = ""

				switch (true) {
					case SQL_COMMANDS.includes(upperToken):
						type = SQL_TYPE.COMMAND
						context = upperToken
						break

					case SQL_KEYWORDS.includes(upperToken):
						type = SQL_TYPE.KEYWORD
						break

					case token === "*" && context === "SELECT":
					case token === "?" && context === "VALUES":
						type = SQL_TYPE.WILDCARD
						break

					case SQL_OPERATORS.includes(upperToken):
						type = SQL_TYPE.OPERATOR
						break

					case token === SQL_PUNCTUATION.PAR_OPEN && context === "INTO":
						type = SQL_TYPE.PAR_OPEN
						isInsertFields = true
						break

					case token === SQL_PUNCTUATION.PAR_CLOSED && context === "INTO":
						type = SQL_TYPE.PAR_CLOSED
						isInsertFields = false
						break

					case token === SQL_PUNCTUATION.PAR_OPEN:
						type = SQL_TYPE.PAR_OPEN
						break

					case token === SQL_PUNCTUATION.PAR_CLOSED:
						type = SQL_TYPE.PAR_CLOSED
						break

					case token === SQL_PUNCTUATION.TERMINATOR:
						type = SQL_TYPE.TERMINATOR
						break

					case token === SQL_PUNCTUATION.SEPARATOR:
						type = SQL_TYPE.SEPARATOR
						break

					case ["FROM", "INTO", "UPDATE"].includes(context) && [false].includes(isInsertFields):
						type = SQL_TYPE.ENTITY
						break

					case ["SELECT", "INTO"].includes(context):
						type = SQL_TYPE.FIELD
						break

					case SQL_COMMENT_MARKERS.includes(upperToken):
						type = SQL_TYPE.COMMENT
						break

					case token.startsWith("'") && token.endsWith("'"):
						type = SQL_TYPE.STRING
						break

					case !Number.isNaN(Number(token)):
						type = SQL_TYPE.NUMBER
						break
					case token === ",":
						type = SQL_TYPE.SEPARATOR
						break
					case token.startsWith('"') && !token.endsWith('"'):
					case token.startsWith("'") && !token.endsWith("'"):
						type = SQL_TYPE.ERROR
						break
					default:
						type = SQL_TYPE.VARIABLE
						break
				}

				return <TSqlToken>{
					token,
					type,
					context,
				}
			})
			.value()

		return tokens
	}
}
