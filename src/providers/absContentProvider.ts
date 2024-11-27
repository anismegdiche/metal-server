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
import _ from "lodash"


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
        // eslint-disable-next-line you-dont-need-lodash-underscore/clone-deep
        return _.cloneDeep(this) as absContentProvider
    }
}