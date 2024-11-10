//
//
//
//
import { Readable } from 'node:stream'
//
import { DataTable } from "../types/DataTable"
import { TContentConfig } from "../providers/data/FilesDataProvider"
import { VirtualFileSystem } from "../utils/VirtualFileSystem"
import { IContent } from "../types/IContent"


//
export abstract class ACContentProvider implements IContent {
    
    abstract Params: unknown            // TS transformed configuration
    EntityName: string = "DEFAULT"
    Config: TContentConfig              // raw configuration
    readonly Content = new VirtualFileSystem()

    constructor(contentConfig: TContentConfig) {
        this.Config = contentConfig
    }

    abstract Init(name: string, content: Readable): void
    abstract Get(sqlQuery?: string): Promise<DataTable>
    abstract Set(contentDataTable: DataTable): Promise<Readable>
}