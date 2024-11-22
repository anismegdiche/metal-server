import { Readable } from "node:stream"
//
import { DataTable } from "./DataTable"
import { TConfigSource } from "./TConfig"
import { TFilesDataOptions } from "../providers/data/FilesData"


export interface IStorage {
    ConfigSource: TConfigSource
    ConfigStorage: TFilesDataOptions
    Init(): void
    Connect(): Promise<void>
    Disconnect(): Promise<void>
    IsExist(file: string): Promise<boolean>
    Read(file: string): Promise<Readable>
    Write(file: string, content: Readable): Promise<void>
    List(): Promise<DataTable>
}
