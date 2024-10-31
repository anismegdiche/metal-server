//
//
//
//
//
import { Readable } from "node:stream"
//
import { DataTable } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { CommonContent } from './CommonContent'
import { IContent } from "../../types/IContent"
import { JsonHelper } from '../../lib/JsonHelper'
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError } from "../../server/HttpErrors"
import { ReadableHelper } from "../../lib/ReadableHelper"

export type TJsonContentConfig = {
    "json-path"?: string
}

export class JsonContent extends CommonContent implements IContent {

    Params:any = {}

    @Logger.LogFunction()
    async Init(entity: string, content: Readable): Promise<void> {
        this.EntityName = entity
        if (this.Config) {
            this.Params = {
                jsonPath: this.Config["json-path"] ?? ""
            }
        }

        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction()
    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        //TODO: when content = "", data has empty json object {}
        const json = JsonHelper.TryParse(
            await ReadableHelper.ToString(
                this.Content.ReadFile(this.EntityName)
            ), {})

        const data = JsonHelper.Get<TJson[]>(json, this.Params.jsonPath)
        return new DataTable(this.EntityName, data).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction()
    async Set(data: DataTable): Promise<Readable> {
        if (!this.Content)
            throw new HttpErrorInternalServerError('Content is not defined')

        //TODO: when content = "", data has empty json object {}
        let json = JsonHelper.TryParse(
            await ReadableHelper.ToString(
                this.Content.ReadFile(this.EntityName)
            ), {})

        json = JsonHelper.Set(
            json,
            this.Params.jsonPath,
            data.Rows
        )

        const streamOut = Readable.from(JSON.stringify(json))
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}