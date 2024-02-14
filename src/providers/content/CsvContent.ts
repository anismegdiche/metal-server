//
//
//
//
//
import * as Csv from 'papaparse'
//
import { DataTable } from "../../types/DataTable"
import { CommonContent, IContent } from './CommonContent'

type TCsvContentConfig = {
    delimiter: string
    newline: string
    header: boolean
    quoteChar: string,
    skipEmptyLines: string | boolean
}

export class CsvContent extends CommonContent implements IContent {

    Content: string = ""
    Config = <TCsvContentConfig>{}

    async Init(name: string, content: string): Promise<void> {
        this.EntityName = name
        if (this.Options) {
            const {
                csvDelimiter: delimiter = ',',
                csvNewline: newline = '\n',
                csvHeader: header = true,
                csvQuoteChar: quoteChar = '"',
                csvSkipEmptyLines: skipEmptyLines = 'greedy'
            } = this.Options

            this.Config = <TCsvContentConfig>{
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

    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        const result = Csv.parse<string>(this.Content, this.Config as Csv.ParseWorkerConfig) as any
        return new DataTable(this.EntityName, result?.data).FreeSql(sqlQuery)
    }

    async Set(contentDataTable: DataTable): Promise<string> {
        this.Content = Csv.unparse(contentDataTable.Rows, this.Config as Csv.UnparseConfig)
        return this.Content
    }
}
