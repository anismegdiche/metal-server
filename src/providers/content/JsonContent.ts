//
//
//
//
//
import { Readable } from "node:stream"
import typia from "typia"
//
import { DataTable } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { JsonHelper } from '../../lib/JsonHelper'
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError } from "../../server/HttpErrors"
import { ReadableHelper } from "../../lib/ReadableHelper"
import { TConvertParams } from "../../lib/TypeHelper"
import { absContentProvider } from "../absContentProvider"
import { Sandbox } from "../../server/Sandbox"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { TContext } from "../../@types/TContext"


//
export type TJsonContentConfig = {
    "json-path"?: string            // JSON path, if undefined will return the whole JSON
}

type TJsonContentParams = {
    [K in keyof TJsonContentConfig as K extends `json-${infer U}` ? TConvertParams<U> : K]: TJsonContentConfig[K]
}


//
export class JsonContent extends absContentProvider {

    Params: TJsonContentParams | undefined

    @Logger.LogFunction()
    async InitContent(entity: string, content: Readable): Promise<void> {
        this.EntityName = entity
        if (this.Config && typia.is<TJsonContentConfig>(this.Config)) {
            this.Params = {
                path: this.Config["json-path"]
            }
        }

        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(Logger.Debug, true)
    async Get(sqlQuery: string | undefined, $context: Partial<TContext>): Promise<DataTable> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('Json: Params is not defined')

        if (!this.Content)
            throw new HttpErrorInternalServerError('Json: Content is not defined')

        const json = JsonHelper.TryParse(
            await ReadableHelper.ToString(
                this.Content.ReadFile(this.EntityName)
            ), {}
        )

        const path = PlaceHolder.EvaluateJsCode<string>(
            ($context?.$request?.["data-path"] ?? this.Params.path) as string,
            new Sandbox($context)
        )

        const data = JsonHelper.Get<TJson[]>(json, path)
        
        return new DataTable(this.EntityName, data).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction(Logger.Debug, true)
    async Set(data: DataTable, $context: Partial<TContext>): Promise<Readable> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('Json: Params is not defined')

        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        //TODO when content = "", data has empty json object {}
        let json = JsonHelper.TryParse(
            await ReadableHelper.ToString(
                this.Content.ReadFile(this.EntityName)
            ), {}
        )

        const path = PlaceHolder.EvaluateJsCode<string>(
            $context?.$request?.["data-path"] ?? this.Params.path,
            new Sandbox($context)
        )

        json = JsonHelper.Set(json, path, data.Rows)

        const streamOut = Readable.from(JSON.stringify(json))
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}