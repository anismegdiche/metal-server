/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable you-dont-need-lodash-underscore/get */
//
//
//
//
//
//
import { TSourceParams } from "../../types/TSourceParams"
import { DataTable } from "../../types/DataTable"
import { TFileProviderOptions } from "../FilesProvider"

/* eslint-disable no-unused-vars */
export interface IContent {
    Name: string
    Options: TFileProviderOptions
    Content: any
    Init(name: string, content: string): Promise<void>
    Get(sqlQuery?: string): Promise<DataTable>
    Set(contentDataTable: DataTable): Promise<string>
}
/* eslint-enable no-unused-vars */

export class CommonContent {

    Name: string = "DEFAULT"
    Options: TFileProviderOptions
    RawContent?: string = undefined

    constructor(sourceParams: TSourceParams) {
        this.Options = sourceParams.options as TFileProviderOptions
    }
}

