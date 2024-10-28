import { DataTable } from "./DataTable"
import { TSourceParams } from "./TSourceParams"
import { TFilesDataProviderOptions } from "../providers/data/FilesDataProvider"
import { Readable } from "node:stream"


export interface IStorage {
    Params: TSourceParams
    Options: TFilesDataProviderOptions
    Init(): void
    Connect(): Promise<void>
    Disconnect(): Promise<void>
    IsExist(file: string): Promise<boolean>
    Read(file: string): Promise<Readable>
    Write(file: string, content: Readable): Promise<void>
    List(): Promise<DataTable>
}
