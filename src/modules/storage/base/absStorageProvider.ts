//
//
//
import { lookup } from 'mime-types'
import { Readable } from 'node:stream'
//
import { DataTable } from "../../../types/DataTable"
import { clsClonable } from "../../../utils/base/clsClonable"
import { TFilesDataOptions } from "../../source/providers/TFilesDataOptions"
import { TConfigSource } from "../../source/types/TConfigSource"


//
export abstract class absStorageProvider extends clsClonable {

    abstract ConfigSource?: TConfigSource
    abstract ConfigStorage?: TFilesDataOptions

    SetConfig(configSource: TConfigSource) {
        this.ConfigSource = configSource
        this.ConfigStorage = configSource.options as TFilesDataOptions
        this.Init()
    }

    abstract Init(): void
    abstract Connect(): Promise<void>
    abstract Disconnect(): Promise<void>
    abstract FileIsExist(file: string): Promise<boolean>
    abstract FileRead(file: string): Promise<Readable>
    abstract FileWrite(file: string, content: Readable): Promise<void>
    abstract FileList(dir?: string): Promise<DataTable>
    abstract FolderList(): Promise<DataTable>
     
    GetMimeType(file?: string): string {
        if (!file) 
            return 'application/x-unknown'
    
        return lookup(file) || 'application/octet-stream'
    }
}