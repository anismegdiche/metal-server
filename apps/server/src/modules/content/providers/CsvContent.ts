//
//
//
import { Readable } from "node:stream"
import { Logger } from "@metal/logger"
import type { TJson } from "@metal/types"
import { JsonUtils } from "@metal/utils"
import { parse } from "csv-parse"
import { stringify } from "csv-stringify"
import { merge } from "lodash-es"
import type { TRow, TRowsCopyParams } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"
import {
	type U__source_options_content_csv,
	z_U__source_options_content_csv,
} from "../types/U__source_options_content_csv"

//
type CsvParams = Record<string, string | boolean | number | undefined>

export const CSV_CHAR_REPLACEMENT = {
	"\r": "\uE000", // Private Use - Plane 16
	"\n": "\uE001",
	"\\": "\uE002",
}

export const CSV_CHAR_REVERSE = {
	"\uE000": "\r",
	"\uE001": "\n",
	"\uE002": "\\",
}

//
export function EscapeNewlines(value: string): string {
	return Object.entries(CSV_CHAR_REPLACEMENT).reduce((acc, [from, to]) => acc.replaceAll(from, to), value)
}

export function UnescapeNewlines(value: string): string {
	return Object.entries(CSV_CHAR_REVERSE).reduce((acc, [from, to]) => acc.replaceAll(from, to), value)
}

//
export class CsvContent extends absContentProvider {
	Params: CsvParams | undefined

	DEFAULT: Partial<U__source_options_content_csv> = {
		"csv-header": true,
		"csv-delimiter": ";",
		"csv-quote": '"',
		"csv-newline": "\r\n",
		"csv-skip-empty-lines": true,
	}

	SetConfig(contentConfig: U__source_options_content_csv): void {
		super.SetConfig(contentConfig)
		this.Config = merge(this.DEFAULT, this.Config) as U__source_options_content_csv

		this.Params = {
			delimiter: this.Config["csv-delimiter"],
			record_delimiter: this.Config["csv-newline"],
			headers: this.Config["csv-header"],
			skip_empty_lines: this.Config["csv-skip-empty-lines"] ?? true,
		}

		this.Params.quote =
			this.Config["csv-quote"] == null || this.Config["csv-quote"] === undefined || this.Config["csv-quote"] === ""
				? '"'
				: this.Config["csv-quote"]
	}

	@Logger.LogFunction()
	InitContent(entity: string, content: Readable): void {
		this.EntityName = entity

		Assert.Var<U__source_options_content_csv>(
			this.Config,
			z_U__source_options_content_csv.safeParse(this.Config).success,
			"Config is not defined",
		)

		this.Content.UploadFile(entity, content)
	}

	@Logger.LogFunction(["$context"])
	async Get(rowsParams: TRowsCopyParams, $context: Partial<TContext>): Promise<DataTable> {
		Assert.Var<VirtualFileSystem>(this.Content, VirtualFileSystem.Is(this.Content), "Content is not defined")

		const $__evalParams = PlaceHolder.EvaluateJsCode<CsvParams>(this.Params, new Sandbox($context))

		// Streaming parse: pipe the file into the parser so the raw CSV is never
		// buffered as a whole string in memory (unlike csv-parse/sync)
		const parser = parse({
			...$__evalParams,
			columns: true,
			relax_column_count: true,
			skip_empty_lines: ($__evalParams?.skip_empty_lines as boolean) ?? true,
		})

		const rows: TJson[] = []

		await new Promise<void>((resolve, reject) => {
			const source = this.Content.ReadFile(this.EntityName)

			source.on("error", reject)
			parser.on("data", (row: TJson) => {
				// Restore escaped newlines in parsed data
				const restoredRow: TJson = {}
				for (const [key, value] of Object.entries(row)) {
					restoredRow[key] = UnescapeNewlines(value)
				}
				rows.push(restoredRow)
			})
			parser.on("error", reject)
			parser.on("end", () => resolve())

			source.pipe(parser)
		})

		using data = new DataTable(this.EntityName, rows)
		return data.Copy(this.EntityName, rowsParams)
	}

	@Logger.LogFunction(true)
	async Set(data: DataTable, $context: Partial<TContext>): Promise<Readable> {
		Assert.Var<VirtualFileSystem>(this.Content, VirtualFileSystem.Is(this.Content), "Content is not defined")

		const $__evalParams = PlaceHolder.EvaluateJsCode<CsvParams>(this.Params, new Sandbox($context))

		// First pass: collect ALL possible columns from ALL rows
		const allColumns = new Set<string>()
		const rows = await data.Rows()
		rows.forEach((row: TRow) => {
			Object.keys(row).forEach((key) => {
				allColumns.add(key)
			})
		})

		const _columns = Array.from(allColumns)

		// Stream flattened rows through csv-stringify so the CSV output is
		// generated incrementally instead of building the whole file in memory
		const rowsSource = Readable.from(
			(async function* () {
				for (const row of rows) {
					const flattenedRow: TRow = {}

					// Ensure all columns are present in each row
					_columns.forEach((col) => {
						let value = row[col]

						// Handle objects (but not dates)
						if (typeof value === "object" && value !== null && !Date.parse(value.toString())) {
							value = JsonUtils.Stringify(value)
						}

						// Escape newlines in string values
						if (typeof value === "string") {
							value = EscapeNewlines(value)
						}

						// Handle missing values
						value ??= ""

						flattenedRow[col] = value
					})

					yield flattenedRow
				}
			})(),
		)

		const stringifier = stringify({
			...$__evalParams,
			header: true,
			columns: _columns,
		})

		rowsSource.pipe(stringifier)

		this.Content.UploadFile(this.EntityName, stringifier)
		return stringifier
	}
}
