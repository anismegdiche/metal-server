//XXX import { Readable } from "node:stream"
//XXX //XXX
//XXX import { DataTable } from "./DataTable"
//XXX import { TConfigSource } from "./TConfig"
//XXX import { TFilesDataOptions } from "../providers/data/FilesData"


//XXX export interface IStorage {
//XXX     ConfigSource: TConfigSource
//XXX     ConfigStorage: TFilesDataOptions
//XXX     Init(): void
//XXX     Connect(): Promise<void>
//XXX     Disconnect(): Promise<void>
//XXX     IsExist(file: string): Promise<boolean>
//XXX     Read(file: string): Promise<Readable>
//XXX     Write(file: string, content: Readable): Promise<void>
//XXX     List(): Promise<DataTable>
//XXX }
