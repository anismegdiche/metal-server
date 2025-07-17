//
//
//
//
import { Readable } from 'node:stream'
//
import { DataTable } from "../../../types/DataTable"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"
import { TContentConfig } from "../@types"
import { clsClonable } from "../../../utils/base/clsClonable"
import { TContext } from "../../sandbox/types/TContext"


//
export interface IContentProvider extends clsClonable {

    Params: unknown                      // TS transformed configuration
    EntityName: string
    Config?: TContentConfig              // raw configuration
    Content: VirtualFileSystem

    SetConfig(contentConfig: TContentConfig): void
    InitContent(name: string, content: Readable): void
    Get(sqlQuery: string | undefined, $context: Partial<TContext>): Promise<DataTable>
    Set(data: DataTable, $context: Partial<TContext>): Promise<Readable>
}