//
//
//
//
//
import { Readable } from "node:stream"
import _ from 'lodash'
//
import { DataTable } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { CommonContent } from './CommonContent'
import { IContent } from "../../types/IContent"
import { JsonHelper } from '../../lib/JsonHelper'
import { Logger } from "../../utils/Logger"

export type TJsonContentConfig = {
    jsonArrayPath?: string
}

export class JsonContent extends CommonContent implements IContent {

    Config = <TJsonContentConfig>{}
    JsonObject: TJson = {}
    IsArray = false

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
        //TODO: when content = "", data has empty json object {}
        this.JsonObject = JsonHelper.TryParse(
            await CommonContent.ReadableToString(
                this.Content.ReadFile(this.EntityName)
            ), {})
        // eslint-disable-next-line you-dont-need-lodash-underscore/is-array
        this.IsArray = _.isArray(this.JsonObject)
    }

    @Logger.LogFunction()
    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        let data: TJson[] = []
        data = JsonHelper.Get<TJson[]>(this.JsonObject, this.Config.jsonArrayPath)
        return new DataTable(this.EntityName, data).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction()
    async Set(contentDataTable: DataTable): Promise<Readable> {

        this.JsonObject = JsonHelper.Set(
            this.JsonObject,
            this.Config.jsonArrayPath,
            contentDataTable.Rows
        )
        const streamOut = Readable.from(JSON.stringify(this.JsonObject))
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}