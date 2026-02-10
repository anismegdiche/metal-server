//
//
//
//
import type { Readable } from 'node:stream'
//
import type { DataTable, TRowsCopyParams } from "../../../types/DataTable"
import type { VirtualFileSystem } from "../../../utils/VirtualFileSystem"
import type { U__source_options_content } from "../@types"
import type { clsClonable } from "../../../utils/base/clsClonable"
import type { TContext } from "../../sandbox/types/TContext"


//
export interface IContentProvider extends clsClonable {

    Params: unknown                      // TS transformed configuration
    EntityName: string
    Config?: U__source_options_content              // raw configuration
    Content: VirtualFileSystem

    SetConfig(contentConfig: U__source_options_content): void
    InitContent(name: string, content: Readable): void
    Get(rowsParams: TRowsCopyParams, $context: Partial<TContext>): Promise<DataTable>
    Set(data: DataTable, $context: Partial<TContext>): Promise<Readable>
}