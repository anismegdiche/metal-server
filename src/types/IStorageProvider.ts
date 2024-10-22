import { DataTable } from "./DataTable"
import { TSourceParams } from "./TSourceParams"
import { TFilesDataProviderOptions } from "../providers/data/FilesDataProvider"


export interface IStorageProvider {
    Params: TSourceParams
    Options: TFilesDataProviderOptions
    Init(): void
    Connect(): Promise<void>
    Disconnect(): Promise<void>
    IsExist(file: string): Promise<boolean>
    Read(file: string): Promise<Buffer>
    Write(file: string, content: Buffer): Promise<void>
    List(): Promise<DataTable>
}
