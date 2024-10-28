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

export type TCsvContentConfig = {
    csvDelimiter?: string
    csvNewline?: string
    csvHeader?: boolean
    csvQuoteChar?: string,
    csvSkipEmptyLines?: string | boolean
}

export class CsvContent extends CommonContent implements IContent {

    Config = <Csv.ParseWorkerConfig>{}

    @Logger.LogFunction()
    async Init(entityName: string, content: Readable): Promise<void> {
        this.EntityName = entityName
        if (this.Options) {
            const {
                csvDelimiter: delimiter = ',',
                csvNewline: newline = '\n',
                csvHeader: header = true,
                csvQuoteChar: quoteChar = '"',
                csvSkipEmptyLines: skipEmptyLines = 'greedy'
            } = this.Options

            this.Config = <Csv.ParseWorkerConfig>{
                ...this.Config,
                delimiter,
                newline,
                header,
                quoteChar,
                skipEmptyLines
            }
        }
        this.Content.UploadFile(entityName, content)
    }

    @Logger.LogFunction()
    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        const parsedCsv: any = Csv.parse<string>(
            await ReadableHelper.ToString(
                this.Content.ReadFile(this.EntityName)
            ), 
            this.Config
        )
        return new DataTable(this.EntityName, parsedCsv?.data).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction()
    async Set(contentDataTable: DataTable): Promise<Readable> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        const streamOut = Readable.from(Csv.unparse(contentDataTable.Rows, this.Config as Csv.UnparseConfig))
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}
