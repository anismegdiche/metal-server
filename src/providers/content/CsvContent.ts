//
//
//
//
//
import * as Csv from 'papaparse'
//
import { DataTable } from "../../types/DataTable"
import { CommonContent } from './CommonContent'
import { IContent } from "../../types/IContent"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError } from "../../server/HttpErrors"
import { Readable } from "node:stream"
import { ReadableHelper } from "../../lib/ReadableHelper"
import { TConvertParams } from "../../lib/TypeHelper"


export type TCsvContentConfig = {
    "csv-delimiter"?: string
    "csv-newline"?: string
    "csv-header"?: boolean
    "csv-quote"?: string,
    "csv-skip-empty"?: boolean | "greedy"
}

type TCsvContentParams = Required<{
    [K in keyof TCsvContentConfig as K extends `csv-${infer U}` ? TConvertParams<U> : K]: TCsvContentConfig[K]
}>


export class CsvContent extends CommonContent implements IContent {

    Params: TCsvContentParams | undefined

    @Logger.LogFunction()
    async Init(entity: string, content: Readable): Promise<void> {
        this.EntityName = entity
        if (this.Config) {
            this.Params = {
                delimiter: this.Config["csv-delimiter"] ?? ',',
                newline: this.Config["csv-newline"] ?? '\n',
                header: this.Config["csv-header"] ?? true,
                quoteChar: this.Config["csv-quote"] ?? '"',
                skipEmptyLines: this.Config["csv-skip-empty"] ?? 'greedy'
            }
        }
        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction()
    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        const parsedCsv: any = Csv.parse<string>(
            await ReadableHelper.ToString(
                this.Content.ReadFile(this.EntityName)
            ),
            this.Params
        )
        return new DataTable(this.EntityName, parsedCsv?.data).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction()
    async Set(contentDataTable: DataTable): Promise<Readable> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        const streamOut = Readable.from(
            Csv.unparse(
                contentDataTable.Rows,
                this.Params as Csv.UnparseConfig
            )
        )
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}
