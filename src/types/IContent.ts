//
//
//
//
//
import { Readable } from 'node:stream'
//
import { DataTable } from "./DataTable"
import { TFilesDataProviderOptions } from "../providers/data/FilesDataProvider"
import { VirtualFileSystem } from "../utils/VirtualFileSystem "


export interface IContent {
    EntityName: string
    Options: TFilesDataProviderOptions
    Content: VirtualFileSystem
    Init(name: string, content: Readable): void
    Get(sqlQuery?: string): Promise<DataTable>
    Set(contentDataTable: DataTable): Promise<Readable>
}
