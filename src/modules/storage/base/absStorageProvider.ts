//
//
//
import { lookup } from 'mime-types'
import { Readable } from 'node:stream'
//
import { DataTable } from "../../../types/DataTable"
import { clsClonable } from "../../../utils/base/clsClonable"
import type { U_config_sources_source } from '../../core/types/U_config_sources'
import type { U__source_storage_file_options } from "../../source/providers/StorageFilesData"


//
export abstract class absStorageProvider extends clsClonable {

    abstract ConfigSource?: U_config_sources_source
    abstract ConfigStorage?: U__source_storage_file_options

    SetConfig(configSource: U_config_sources_source) {
        this.ConfigSource = configSource
        this.ConfigStorage = configSource.options as U__source_storage_file_options
        this.Init()
    }

    abstract Init(): void
    //
    abstract Connect(): Promise<void>
    abstract Disconnect(): Promise<void>
    //
    abstract FolderIsExist(dirName: string): Promise<boolean>
    abstract FolderCreate(dirName: string): Promise<void>
    abstract FolderListFolders(): Promise<DataTable>
    abstract FolderListFiles(dirName?: string): Promise<DataTable>
    //
    abstract FileIsExist(dirName: string, fileName: string): Promise<boolean>
    abstract FileRead(dirName: string, fileName: string): Promise<Readable>
    abstract FileWrite(dirName: string, fileName: string, content: Readable): Promise<void>
    abstract FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void>
    abstract FileDelete(dirName: string, fileName: string): Promise<void>
    //
    GetMimeType(fileName?: string): string {
        if (!fileName)
            return 'application/x-unknown'

        return lookup(fileName) || 'application/octet-stream'
    }
}