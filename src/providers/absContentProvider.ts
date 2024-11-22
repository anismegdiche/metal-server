//
//
//
//
import { Readable } from 'node:stream'
//
import { DataTable } from "../types/DataTable"
import { VirtualFileSystem } from "../utils/VirtualFileSystem"
import { TContentConfig } from "./ContentProvider"
import { TJson } from "../types/TJson"


//
export abstract class absContentProvider {
    
    abstract Params: unknown            // TS transformed configuration
    EntityName: string = "DEFAULT"
    Config?: TContentConfig              // raw configuration
    Content = new VirtualFileSystem()

    SetConfig(contentConfig: TContentConfig) {
        this.Config = contentConfig
    }

    GetConfig(): TJson {
        return this.Config ?? {}
    }

    abstract InitContent(name: string, content: Readable): void
    abstract Get(sqlQuery?: string): Promise<DataTable>
    abstract Set(data: DataTable): Promise<Readable>

    Clone(): absContentProvider {
        const clone:absContentProvider = Object.create(this)
        clone.Params = this.Params
        clone.EntityName = this.EntityName
        clone.Config = this.Config
        clone.Content = this.Content
        return clone
    }
}