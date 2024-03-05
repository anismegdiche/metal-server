/* eslint-disable class-methods-use-this */
/* eslint-disable you-dont-need-lodash-underscore/get */
//
//
//
//
//
//
import { TSourceParams } from "../../types/TSourceParams"
import { DataTable } from "../../types/DataTable"
import { TFilesDataProviderOptions } from "../data/FilesDataProvider"

/* eslint-disable no-unused-vars */
export interface IContent {
    EntityName: string
    Options: TFilesDataProviderOptions
    Content: unknown
    Init(name: string, content: string): void
    Get(sqlQuery?: string): Promise<DataTable>
    Set(contentDataTable: DataTable): Promise<string>
}
/* eslint-enable no-unused-vars */

export class CommonContent {

    EntityName: string = "DEFAULT"
    Options: TFilesDataProviderOptions
    RawContent?: string = undefined

    constructor(sourceParams: TSourceParams) {
        this.Options = sourceParams.options as TFilesDataProviderOptions
    }
}

