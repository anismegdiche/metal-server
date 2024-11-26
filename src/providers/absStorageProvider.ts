//
//
//
//
import { Readable } from 'node:stream'
//
import { DataTable } from "../types/DataTable"
import { TConfigSource } from "../types/TConfig"
import { TFilesDataOptions } from "./data/FilesData"


//
export abstract class absStorageProvider {

    abstract ConfigSource?: TConfigSource
    abstract ConfigStorage?: TFilesDataOptions

    constructor() {

    }

    SetConfig(configSource: TConfigSource) {
        this.ConfigSource = configSource
        this.ConfigStorage = configSource.options as TFilesDataOptions
        this.Init()
    }

    abstract Init(): void
    abstract Connect(): Promise<void>
    abstract Disconnect(): Promise<void>
    abstract IsExist(file: string): Promise<boolean>
    abstract Read(file: string): Promise<Readable>
    abstract Write(file: string, content: Readable): Promise<void>
    abstract List(): Promise<DataTable>


    Clone(): absStorageProvider {
        const clone: absStorageProvider = Object.create(this)
        clone.ConfigSource = this.ConfigSource
        clone.ConfigStorage = this.ConfigStorage
        return clone
    }
}