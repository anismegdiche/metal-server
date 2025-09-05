//
//
//
// Lazy-loaded module
import { is as TypiaIs } from "typia"
//
import { Readable } from "node:stream"
//
import { DataTable } from "../../../types/DataTable"
import { TJson } from '../../../types/TJson'
import { Assert } from '../../../utils/Assert'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { StringUtils } from "../../../utils/StringUtils"
import { Sandbox } from "../../sandbox/Sandbox"
import { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"
import { TCsvContentConfig } from '../types/TCsvContentConfig'
import { TCsvContentParams } from '../types/TCsvContentParams'
import { VirtualFileSystem } from '../../../utils/VirtualFileSystem'


//
export class CsvContent extends absContentProvider {
    private static _papaParseModule: typeof import('papaparse');
    private static async _loadPapaParseModule(): Promise<typeof import('papaparse')> {
        if (!this._papaParseModule) {
            this._papaParseModule = await import('papaparse');
        }
        return this._papaParseModule;
    }

    Params: TCsvContentParams | undefined

    @Logger.LogFunction()
    InitContent(entity: string, content: Readable): void {
        this.EntityName = entity
        if (this.Config && TypiaIs<TCsvContentConfig>(this.Config)) {
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

        Assert.Var<VirtualFileSystem>(this.Content,
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const $__evalParams = PlaceHolder.EvaluateJsCode<import('papaparse').ParseConfig>(
            this.Params,
            new Sandbox($context)
        )

        const papaparse = await CsvContent._loadPapaParseModule();
        // TODO to test
        const parsedCsv = papaparse.parse<TJson>(
            await ReadableUtils.ToString(
                this.Content.ReadFile(this.EntityName)
            ),
            $__evalParams
        )
        return new DataTable(this.EntityName, parsedCsv.data).FreeSqlAsync(sqlQuery)
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

        //flattern nested objects in data.Rows
        const _dataFlatten = data.Rows.map((row) => Object.fromEntries(
            Object.entries(row).map(([k, v]) => [
                k,
                // and is not date
                typeof v === "object" && v !== null && !Date.parse(v.toString())
                    ? JsonUtils.Stringify(v)
                    : v
            ])
        ));

        const papaparse = await CsvContent._loadPapaParseModule();
        const streamOut = Readable.from(
            papaparse.unparse(
                _dataFlatten,
                $__evalParams
            )
        )
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}
