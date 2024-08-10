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
import { JsonHelper } from '../../lib/JsonHelper'

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
        //TODO: when content = "", data has empty json object {}
        this.Content = JsonHelper.TryParse(content, {})
        // eslint-disable-next-line you-dont-need-lodash-underscore/is-array
        this.IsArray = _.isArray(this.Content)
    }

    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        let data: TJson[] = []
        data = JsonHelper.Get<TJson[]>(this.Content, this.Config.arrayPath)
        return new DataTable(this.EntityName, data).FreeSql(sqlQuery)
    }

    async Set(contentDataTable: DataTable): Promise<string> {

        this.Content = JsonHelper.Set(
            this.Content,
            this.Config.arrayPath,
            contentDataTable.Rows
        )
        this.RawContent = JSON.stringify(this.Content)
        return this.RawContent
    }
}