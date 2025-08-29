//
//
//
import { Readable } from "node:stream"
import typia from "typia"
//
import { DataTable } from "../../../types/DataTable"
import { TJson } from "../../../types/TJson"
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from "../../../utils/Logger"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { absContentProvider } from "../base/absContentProvider"
import { Sandbox } from "../../sandbox/Sandbox"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { TContext } from "../../sandbox/types/TContext"
import { TJsonContentConfig } from "../types/TJsonContentConfig"
import { TJsonContentParams } from "../types/TJsonContentParams"
import { Assert } from "../../../utils/Assert"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"


//
export class JsonContent extends absContentProvider {

    Params: TJsonContentParams | undefined

    @Logger.LogFunction()
    InitContent(entity: string, content: Readable): void {
        this.EntityName = entity
        if (this.Config && typia.is<TJsonContentConfig>(this.Config)) {
            this.Params = {
                path: this.Config["json-path"]
            }
        }

        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(['$context'])
    async Get(sqlQuery: string | undefined, $context: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TJsonContentParams>(this.Params, 
            typia.is<TJsonContentParams>(this.Params),
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content, 
            typia.is<VirtualFileSystem>(this.Content),
            'Content is not defined')

        const json = JsonUtils.TryParse(
            await ReadableUtils.ToString(
                this.Content.ReadFile(this.EntityName)
            ), {}
        )

        const $__path = PlaceHolder.EvaluateJsCode<string>(
            ($context?.$request?.["data-path"] ?? this.Params.path) as string,
            new Sandbox($context)
        )

        const data = JsonUtils.Get<TJson[]>(json, $__path)

        return new DataTable(this.EntityName, data).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction(true)
    async Set(data: DataTable, $context: Partial<TContext>): Promise<Readable> {
        Assert.Var<TJsonContentParams>(this.Params, 
            typia.is<TJsonContentParams>(this.Params),
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content, 
            typia.is<VirtualFileSystem>(this.Content),
            'Content is not defined')

        //TODO when content = "", data has empty json object {}
        let json = JsonUtils.TryParse(
            await ReadableUtils.ToString(
                this.Content.ReadFile(this.EntityName)
            ), {}
        )

        const $__path = PlaceHolder.EvaluateJsCode<string>(
            $context?.$request?.["data-path"] ?? this.Params.path,
            new Sandbox($context)
        )

        JsonUtils.Set(json, $__path, data.Rows)

        const streamOut = Readable.from(JSON.stringify(json))
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}