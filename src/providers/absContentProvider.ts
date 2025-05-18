//
//
//
//
import { Readable } from 'node:stream'
//
import { DataTable } from "../types/DataTable"
import { VirtualFileSystem } from "../utils/VirtualFileSystem"
import { TContentConfig } from "./ContentProvider"
import { clsClonable } from "../utils/base/clsClonable"
import { TContext } from "../@types/TContext"


//
export abstract class absContentProvider extends clsClonable { //NOSONAR

    abstract Params: unknown            // TS transformed configuration
    EntityName: string = "DEFAULT"
    Config?: TContentConfig              // raw configuration
    Content = new VirtualFileSystem()

    SetConfig(contentConfig: TContentConfig) {
        this.Config = contentConfig
    }

    abstract InitContent(name: string, content: Readable): void
    abstract Get(sqlQuery: string | undefined, $context: Partial<TContext>): Promise<DataTable>
    abstract Set(data: DataTable, $context: Partial<TContext>): Promise<Readable>
}