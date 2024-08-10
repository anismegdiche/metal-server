 
//
//
//
//
//
import { TSourceParams } from "../../types/TSourceParams"
import { DataTable } from "../../types/DataTable"
import { TFilesDataProviderOptions } from "../data/FilesDataProvider"

 
export interface IContent {
    EntityName: string
    Options: TFilesDataProviderOptions
    Content: unknown
    Init(name: string, content: string): void
    Get(sqlQuery?: string): Promise<DataTable>
    Set(contentDataTable: DataTable): Promise<string>
}
 

export class CommonContent {

    EntityName: string = "DEFAULT"
    Options: TFilesDataProviderOptions
    RawContent?: string = undefined

    constructor(sourceParams: TSourceParams) {
        this.Options = sourceParams.options as TFilesDataProviderOptions
    }
}