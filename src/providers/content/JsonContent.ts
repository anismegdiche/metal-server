/* eslint-disable you-dont-need-lodash-underscore/get */
import { DataTable } from "../../types/DataTable"
import _ from 'lodash'
import { CommonContent, IContent } from './CommonContent'
import { TJson } from "../../types/TJson"

type TJsonContentConfig = {
    arrayPath: string
}

export class JsonContent extends CommonContent implements IContent {

    Content: TJson = {}
    Config = <TJsonContentConfig>{}

    async Init(name: string, content: string): Promise<void> {
        this.Name = name
        if (this.Options) {
            const {
                jsonArrayPath: arrayPath = ''
            } = this.Options

            this.Config = {
                ...this.Config,
                arrayPath
            }
        }

        this.RawContent = content
        this.Content = content && typeof content === 'string'
            ? JSON.parse(content)
            : {}
    }

    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        const data: TJson[] = _.get(
            this.Content,
            this.Config.arrayPath
        ) as TJson[]
        return new DataTable(this.Name, data).FreeSql(sqlQuery)
    }

    async Set(contentDataTable: DataTable): Promise<string> {
        _.set(
            this.Content,
            this.Config.arrayPath,
            contentDataTable.Rows
        )
        this.RawContent = JSON.stringify(this.Content)
        return this.RawContent
    }
}