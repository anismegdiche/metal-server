//
//
//
//
//
import { Readable } from 'node:stream'
//
import { DataTable } from "./DataTable"
import { TContentConfig } from "../providers/data/FilesDataProvider"
import { VirtualFileSystem } from "../utils/VirtualFileSystem"
import { TJson } from "./TJson"


export interface IContent {
    EntityName: string
    Config: TContentConfig   // raw configuration
    Params: unknown            // TS transformed configuration
    Content: VirtualFileSystem
    Init(name: string, content: Readable): void
    Get(sqlQuery?: string): Promise<DataTable>
    Set(contentDataTable: DataTable): Promise<Readable>
}
