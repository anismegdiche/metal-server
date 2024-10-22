//
//
//
//
//
import { DataTable } from "./DataTable"
import { TFilesDataProviderOptions } from "../providers/data/FilesDataProvider"


export interface IContent {
    EntityName: string
    Options: TFilesDataProviderOptions
    Content: unknown
    Init(name: string, content: Buffer): void
    Get(sqlQuery?: string): Promise<DataTable>
    Set(contentDataTable: DataTable): Promise<Buffer>
}
