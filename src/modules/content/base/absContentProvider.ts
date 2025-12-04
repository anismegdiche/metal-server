//
//
//
//
import { Readable } from 'node:stream'
//
import { DataTable, TRowsCopyParams } from "../../../types/DataTable"
import { clsClonable } from "../../../utils/base/clsClonable"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"
//
//
import { TContentConfig } from "../@types"
import { IContentProvider } from './IContentProvider'
import { TContext } from '../../sandbox/types/TContext'


//
export abstract class absContentProvider extends clsClonable implements IContentProvider { //NOSONAR

    abstract Params: unknown            // TS transformed configuration
    EntityName: string = "DEFAULT"
    Config?: TContentConfig              // raw configuration
    Content = new VirtualFileSystem()

    SetConfig(contentConfig: TContentConfig): void {
        this.Config = contentConfig
    }

    abstract InitContent(name: string, content: Readable): void
    abstract Get(rowsParams: TRowsCopyParams, $context: Partial<TContext>): Promise<DataTable>
    abstract Set(data: DataTable, $context: Partial<TContext>): Promise<Readable>
}