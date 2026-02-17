//
//
//
import { merge } from "lodash-es"
import { Readable } from "node:stream"
import Papa, { type ParseConfig, type UnparseConfig } from "papaparse"
import z from "zod"
//
import type { TRow, TRowsCopyParams } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import type { TJson } from '../../../types/TJson'
import { Assert } from '../../../utils/Assert'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { StringUtils } from "../../../utils/StringUtils"
import { VirtualFileSystem } from '../../../utils/VirtualFileSystem'
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"


//
export const z_U__source_options_content_csv = z.object({
    "csv-delimiter": z.string().optional(),
    "csv-newline": z.string().optional(),
    "csv-header": z.boolean().optional(),
    "csv-quote": z.union([
        z.string(),
        z.null()
    ]).optional(),
    "csv-skip-empty": z.union([
        z.boolean(),
        z.literal("greedy")
    ]).optional()
});


//
export type U__source_options_content_csv = z.infer<typeof z_U__source_options_content_csv>


//
export class CsvContent extends absContentProvider {
    Params: UnparseConfig | undefined

    DEFAULT: U__source_options_content_csv = {
        "csv-header": true,
        "csv-delimiter": ';',
        "csv-quote": '"',
        "csv-newline": '\r\n',
        "csv-skip-empty": 'greedy'
    }

    static EscapeNewlines(value: string): string {
        return value
            .replace(/\\/g, '\\\\')
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
    }

    static UnescapeNewlines(value: string): string {
        return value
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\\\/g, '\\')
    }

    SetConfig(contentConfig: U__source_options_content_csv): void {
        super.SetConfig(contentConfig)
        this.Config = merge(this.DEFAULT, this.Config) as U__source_options_content_csv

        this.Params = {
            delimiter: this.Config["csv-delimiter"],
            newline: this.Config["csv-newline"],
            header: this.Config["csv-header"],
            skipEmptyLines: this.Config["csv-skip-empty"]
        }

        this.Params.quoteChar =
            (this.Config["csv-quote"] == null || this.Config["csv-quote"] == undefined || this.Config["csv-quote"] == '')
                ? undefined
                : this.Config["csv-quote"]

        this.Params.quotes = !StringUtils.IsEmpty(this.Config["csv-quote"])
    }

    @Logger.LogFunction()
    InitContent(entity: string, content: Readable): void {
        this.EntityName = entity

        Assert.Var<U__source_options_content_csv>(this.Config,
            z_U__source_options_content_csv.safeParse(this.Config).success,
            'Config is not defined')

        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(['$context'])
    async Get(rowsParams: TRowsCopyParams, $context: Partial<TContext>): Promise<DataTable> {

        Assert.Var<VirtualFileSystem>(this.Content,
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const $__evalParams = PlaceHolder.EvaluateJsCode<ParseConfig>(
            this.Params,
            new Sandbox($context)
        )

        const parsedCsv = Papa.parse<TJson>(
            await ReadableUtils.ToString(
                this.Content.ReadFile(this.EntityName)
            ),
            $__evalParams
        )

        // Restore escaped newlines in parsed data
        const restoredData = parsedCsv.data.map((row: TJson) => {
            const restoredRow: TJson = {}
            for (const [key, value] of Object.entries(row)) {
                restoredRow[key] = CsvContent.UnescapeNewlines(value)
            }
            return restoredRow
        })

        using data = new DataTable(this.EntityName, restoredData)
        return data.Copy(this.EntityName, rowsParams)
    }

    @Logger.LogFunction(true)
    async Set(data: DataTable, $context: Partial<TContext>): Promise<Readable> {

        Assert.Var<VirtualFileSystem>(this.Content,
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const $__evalParams = PlaceHolder.EvaluateJsCode<UnparseConfig>(
            this.Params,
            new Sandbox($context)
        )

        // Flatten nested objects and escape newlines in data.GetRows()
        const _dataFlatten = await data.ForEach(
            (row: TRow) => Object.fromEntries(
                Object.entries(row).map(([k, v]) => {
                    let processedValue = v

                    // Handle objects (but not dates)
                    if (typeof v === "object" && v !== null && !Date.parse(v.toString())) {
                        processedValue = JsonUtils.Stringify(v)
                    }

                    // Escape newlines in string values
                    if (typeof processedValue === 'string') {
                        processedValue = CsvContent.EscapeNewlines(processedValue)
                    }

                    return [k, processedValue]
                })
            )
        )

        const streamOut = Readable.from(
            Papa.unparse(
                _dataFlatten,
                $__evalParams
            )
        )
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}
