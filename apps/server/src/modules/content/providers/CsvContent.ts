//
//
//
import { Readable } from "node:stream"
import { parse } from "csv-parse/sync"
import { stringify } from "csv-stringify/sync"
import { merge } from "lodash-es"
import z from "zod"
//
import type { TRow, TRowsCopyParams } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"

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
export const z_U__source_options_content_csv = z.object({
	"csv-delimiter": z.string().optional(),
	"csv-newline": z.string().optional(),
	"csv-header": z.boolean().optional(),
	"csv-quote": z.union([z.string(), z.null()]).optional(),
	"csv-skip-empty-lines": z.union([z.boolean(), z.literal("greedy")]).optional(),
})

//
export type U__source_options_content_csv = z.infer<typeof z_U__source_options_content_csv>

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

	DEFAULT: U__source_options_content_csv = {
		"csv-header": true,
		"csv-delimiter": ";",
		"csv-quote": '"',
		"csv-newline": "\r\n",
		"csv-skip-empty-lines": "greedy",
	}

	SetConfig(contentConfig: U__source_options_content_csv): void {
		super.SetConfig(contentConfig)
		this.Config = merge(this.DEFAULT, this.Config) as U__source_options_content_csv

		this.Params = {
			delimiter: this.Config["csv-delimiter"],
			record_delimiter: this.Config["csv-newline"],
			headers: this.Config["csv-header"],
			skip_empty_lines:
				this.Config["csv-skip-empty-lines"] === true ? true : this.Config["csv-skip-empty-lines"] === "greedy",
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

		const parsedCsv = parse<TJson>(await ReadableUtils.ToString(this.Content.ReadFile(this.EntityName)), {
			...$__evalParams,
			columns: true,
			relax_column_count: true,
			skip_empty_lines: ($__evalParams?.skip_empty_lines as boolean) ?? true,
		})

		// Restore escaped newlines in parsed data
		const restoredData = parsedCsv.map((row: TJson) => {
			const restoredRow: TJson = {}
			for (const [key, value] of Object.entries(row)) {
				restoredRow[key] = UnescapeNewlines(value)
			}
			return restoredRow
		})

		using data = new DataTable(this.EntityName, restoredData)
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

		// Flatten nested objects and escape newlines in data.GetRows()
		const _dataFlatten = rows.map((row: TRow) => {
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

			return flattenedRow
		})

		const csvString = stringify(_dataFlatten, {
			...$__evalParams,
			header: true,
			columns: _columns,
		})

		const streamOut = Readable.from(csvString)

		this.Content.UploadFile(this.EntityName, streamOut)
		return this.Content.ReadFile(this.EntityName)
	}
}
