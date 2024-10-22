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

export type TCsvContentConfig = {
    csvDelimiter?: string
    csvNewline?: string
    csvHeader?: boolean
    csvQuoteChar?: string,
    csvSkipEmptyLines?: string | boolean
}

export class CsvContent extends CommonContent implements IContent {

    Content: Buffer | undefined = undefined
    Config = <Csv.ParseWorkerConfig>{}

    @Logger.LogFunction()
    async Init(name: string, content: Buffer): Promise<void> {
        this.EntityName = name
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

        this.Content = content
    }

    @Logger.LogFunction()
    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        const result = Csv.parse<string>(this.Content.toString('utf8'), this.Config) as any
        return new DataTable(this.EntityName, result?.data).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction()
    async Set(contentDataTable: DataTable): Promise<Buffer> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        this.Content = Buffer.from(Csv.unparse(contentDataTable.Rows, this.Config as Csv.UnparseConfig), 'utf8')
        return this.Content
    }
}
