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
    jsonArrayPath?: string
}

export class JsonContent extends CommonContent implements IContent {

    Config = <TJsonContentConfig>{}
    //XXX JsonObject: TJson = {}
    //XXX IsArray = false

    @Logger.LogFunction()
    async Init(entityName: string, content: Readable): Promise<void> {
        this.EntityName = entityName
        if (this.Options) {
            const {
                jsonArrayPath = undefined
            } = this.Options

            this.Config = {
                ...this.Config,
                jsonArrayPath: jsonArrayPath
            }
        }

        this.Content.UploadFile(entityName, content)

        //XXX eslint-disable-next-line you-dont-need-lodash-underscore/is-array
        //XXX this.IsArray = _.isArray(this.JsonObject)
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

        //XXX let data: TJson[] = []
        const data = JsonHelper.Get<TJson[]>(json, this.Config.jsonArrayPath)
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
            this.Config.jsonArrayPath,
            data.Rows
        )
        const streamOut = Readable.from(JSON.stringify(json))
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}