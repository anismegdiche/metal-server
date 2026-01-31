//
//
//
import { merge } from "lodash-es"
import { Readable } from "node:stream"
import Papa, { type ParseConfig } from "papaparse"
//
import type { TRow, TRowsCopyParams } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import type { TJson } from '../../../types/TJson'
import { Assert } from '../../../utils/Assert'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { z_TCsvContentConfig } from "../../../utils/Schemas"
import { VirtualFileSystem } from '../../../utils/VirtualFileSystem'
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"
import type { TCsvContentConfig } from '../types/TCsvContentConfig'
import type { TCsvContentParams } from '../types/TCsvContentParams'
import { StringUtils } from "../../../utils/StringUtils"



//
export class CsvContent extends absContentProvider {
    Params: TCsvContentParams | undefined

    DEFAULT: TCsvContentParams = {
        header: true,
        delimiter: ';',
        quoteChar: '"',
        newline: '\r\n',
        skipEmptyLines: 'greedy',
        quotes: true
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

    @Logger.LogFunction()
    InitContent(entity: string, content: Readable): void {
        this.EntityName = entity
        if (this.Config && z_TCsvContentConfig.safeParse(this.Config).success) {
            const config = this.Config as TCsvContentConfig
            this.Params = merge(this.DEFAULT, {
                delimiter: config["csv-delimiter"],
                newline: config["csv-newline"],
                header: config["csv-header"],
                skipEmptyLines: config["csv-skip-empty"]
            })
            this.Params.quoteChar = config["csv-quote"] == null || config["csv-quote"] == undefined || config["csv-quote"] == ''
                ? undefined
                : config["csv-quote"]

            this.Params.quotes = !StringUtils.IsEmpty(config["csv-quote"])
        }

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

        const $__evalParams = PlaceHolder.EvaluateJsCode<TCsvContentParams>(
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
