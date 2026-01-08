//
//
//
import { Readable } from "node:stream"
import { z_TJsonContentConfig, z_TJsonContentParams } from "../../../utils/Schemas"
//
import { DataTable } from "../../../types/DataTable"
import type { TRowsCopyParams } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from "../../../utils/Logger"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { absContentProvider } from "../base/absContentProvider"
import { Sandbox } from "../../sandbox/Sandbox"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import type { TContext } from "../../sandbox/types/TContext"
import type { TJsonContentConfig } from "../types/TJsonContentConfig"
import type { TJsonContentParams } from "../types/TJsonContentParams"
import { Assert } from "../../../utils/Assert"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"


//
export class JsonContent extends absContentProvider {

    Params: TJsonContentParams | undefined

    @Logger.LogFunction()
    InitContent(entity: string, content: Readable): void {
        this.EntityName = entity
        if (this.Config && z_TJsonContentConfig.safeParse(this.Config).success) {
            const config = this.Config as TJsonContentConfig
            this.Params = {
                path: config["json-path"]
            }
        }

        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(['$context'])
    async Get(rowsParams: TRowsCopyParams, $context: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TJsonContentParams>(this.Params,
            z_TJsonContentParams.safeParse(this.Params).success,
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content,
            VirtualFileSystem.Is(this.Content),
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

        using _data = new DataTable(this.EntityName, data)
        return _data.Copy(this.EntityName, rowsParams)
    }

    @Logger.LogFunction(true)
    async Set(data: DataTable, $context: Partial<TContext>): Promise<Readable> {
        Assert.Var<TJsonContentParams>(this.Params,
            z_TJsonContentParams.safeParse(this.Params).success,
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content,
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        //TODO when content = "", data has empty json object {}
        const readable = this.Content.ReadFile(this.EntityName)
        const str = await ReadableUtils.ToString(readable)
        const json = JsonUtils.TryParse(str, {})

        const $__path = PlaceHolder.EvaluateJsCode<string>(
            $context?.$request?.["data-path"] ?? this.Params.path,
            new Sandbox($context)
        )

        JsonUtils.Set(json, $__path, await data.Rows())

        const streamOut = Readable.from(JSON.stringify(json))
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}