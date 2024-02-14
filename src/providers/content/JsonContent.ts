/* eslint-disable you-dont-need-lodash-underscore/get */
//
//
//
//
//
import _ from 'lodash'
//
import { DataTable } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { CommonContent, IContent } from './CommonContent'
import { Helper } from '../../lib/Helper'

type TJsonContentConfig = {
    arrayPath?: string
}

export class JsonContent extends CommonContent implements IContent {

    Content: TJson = {}
    Config = <TJsonContentConfig>{}
    IsArray = false

    async Init(entityName: string, content: string): Promise<void> {
        this.EntityName = entityName
        if (this.Options) {
            const {
                jsonArrayPath: arrayPath = undefined
            } = this.Options

            this.Config = {
                ...this.Config,
                arrayPath
            }
        }

        this.RawContent = content
        this.Content = Helper.JsonTryParse(content, {})
        // eslint-disable-next-line you-dont-need-lodash-underscore/is-array
        this.IsArray = _.isArray(this.Content)
    }

    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        let data: TJson[] = []

        data = Helper.JsonGet<TJson[]>(this.Content, this.Config.arrayPath)

        return new DataTable(this.EntityName, data).FreeSql(sqlQuery)
    }

    async Set(contentDataTable: DataTable): Promise<string> {

        this.Content = Helper.JsonSet(
            this.Content,
            this.Config.arrayPath,
            contentDataTable.Rows
        )
        this.RawContent = JSON.stringify(this.Content)
        return this.RawContent
    }
}