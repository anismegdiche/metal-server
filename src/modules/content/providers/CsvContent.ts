//
//
//
import * as Csv from 'papaparse'
import typia from "typia"
//
import { DataTable } from "../../../types/DataTable"
import { Logger } from "../../../utils/Logger"
import { HttpErrorInternalServerError } from "../../errors/HttpErrors"
import { Readable } from "node:stream"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { absContentProvider } from "../base/absContentProvider"
import { StringUtils } from "../../../utils/StringUtils"
import { TContext } from "../../sandbox/types/TContext"
import { Sandbox } from "../../sandbox/Sandbox"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { TJson } from "../../../types/TJson"
import { TCsvContentConfig } from '../types/TCsvContentConfig'
import { TCsvContentParams } from '../types/TCsvContentParams'


export class CsvContent extends absContentProvider {

    Params: TCsvContentParams | undefined

    @Logger.LogFunction()
    InitContent(entity: string, content: Readable): void {
        this.EntityName = entity
        if (this.Config && typia.is<TCsvContentConfig>(this.Config)) {
            this.Params = {
                delimiter: this.Config["csv-delimiter"] ?? ',',
                newline: this.Config["csv-newline"] ?? '\n',
                header: this.Config["csv-header"] ?? true,
                quoteChar: (StringUtils.IsEmpty(this.Config["csv-quote"]))
                    ? '"'
                    : this.Config["csv-quote"]!,
                skipEmptyLines: this.Config["csv-skip-empty"] ?? 'greedy'
            }
        }
        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(['$context'])
    async Get(sqlQuery: string | undefined, $context: Partial<TContext>): Promise<DataTable> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        const $__evalParams = PlaceHolder.EvaluateJsCode<Csv.ParseConfig>(
            this.Params,
            new Sandbox($context)
        )
        // TODO to test
        const parsedCsv = Csv.parse<TJson>(
            await ReadableUtils.ToString(
                this.Content.ReadFile(this.EntityName)
            ),
            $__evalParams
        )
        return new DataTable(this.EntityName, parsedCsv.data).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction(true)
    async Set(data: DataTable, $context: Partial<TContext>): Promise<Readable> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        const $__evalParams = PlaceHolder.EvaluateJsCode<TCsvContentParams>(
            this.Params,
            new Sandbox($context)
        )

        const streamOut = Readable.from(
            Csv.unparse(
                data.Rows,
                $__evalParams
            )
        )
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}
