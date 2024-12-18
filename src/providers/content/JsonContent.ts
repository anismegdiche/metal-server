//
//
//
//
//
import { Readable } from "node:stream"
//
import { DataTable } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { JsonHelper } from '../../lib/JsonHelper'
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError } from "../../server/HttpErrors"
import { ReadableHelper } from "../../lib/ReadableHelper"
import { TConvertParams } from "../../lib/TypeHelper"
import { ACContentProvider } from "../ACContentProvider"

export type TJsonContentConfig = {
    "json-path"?: string
}

type TJsonContentParams = Required<{
    [K in keyof TJsonContentConfig as K extends `json-${infer U}` ? TConvertParams<U> : K]: TJsonContentConfig[K]
}>

export class JsonContent extends ACContentProvider {

    Params: TJsonContentParams | undefined

    @Logger.LogFunction()
    async Init(entity: string, content: Readable): Promise<void> {
        this.EntityName = entity
        if (this.Config) {
            this.Params = {
                path: this.Config["json-path"] ?? ""
            }
        }

        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(Logger.Debug,true)
    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('Json: Params is not defined')

        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        //TODO: when content = "", data has empty json object {}
        const json = JsonHelper.TryParse(
            await ReadableHelper.ToString(
                this.Content.ReadFile(this.EntityName)
            ), {})

        const data = JsonHelper.Get<TJson[]>(json, this.Params.path)
        return new DataTable(this.EntityName, data).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction(Logger.Debug,true)
    async Set(data: DataTable): Promise<Readable> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('Json: Params is not defined')
        
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        //TODO: when content = "", data has empty json object {}
        let json = JsonHelper.TryParse(
            await ReadableHelper.ToString(
                this.Content.ReadFile(this.EntityName)
            ), {})

        json = JsonHelper.Set(
            json,
            this.Params.path,
            data.Rows
        )

        const streamOut = Readable.from(JSON.stringify(json))
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}