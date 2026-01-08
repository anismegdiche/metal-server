//
//
//
// Lazy-loaded module
import { z_TCsvContentConfig } from "../../../utils/Schemas"
//
import { Readable } from "node:stream"
//
import { DataTable } from "../../../types/DataTable"
import type { TRow, TRowsCopyParams } from "../../../types/DataTable"
import type { TJson } from '../../../types/TJson'
import { Assert } from '../../../utils/Assert'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { StringUtils } from "../../../utils/StringUtils"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"
import type { TCsvContentConfig } from '../types/TCsvContentConfig'
import type { TCsvContentParams } from '../types/TCsvContentParams'
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
        if (this.Config && z_TCsvContentConfig.safeParse(this.Config).success) {
            const config = this.Config as TCsvContentConfig
            this.Params = {
                delimiter: config["csv-delimiter"] ?? ',',
                newline: config["csv-newline"] ?? '\n',
                header: config["csv-header"] ?? true,
                quoteChar: (StringUtils.IsEmpty(config["csv-quote"]))
                    ? '"'
                    : config["csv-quote"]!,
                skipEmptyLines: config["csv-skip-empty"] ?? 'greedy'
            }
        }
        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(['$context'])
    async Get(rowsParams: TRowsCopyParams, $context: Partial<TContext>): Promise<DataTable> {

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
        using data = new DataTable(this.EntityName, parsedCsv.data)
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

        //flattern nested objects in data.GetRows()
        const _dataFlatten = await data.ForEach(
            (row: TRow) => Object.fromEntries(
                Object.entries(row).map(([k, v]) => [
                    k,
                    // and is not date
                    typeof v === "object" && v !== null && !Date.parse(v.toString())
                        ? JsonUtils.Stringify(v)
                        : v
                ])
            )
        )

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
