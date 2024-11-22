//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX import { Readable } from 'node:stream'
//XXX //XXX
//XXX import { DataTable } from "./DataTable"
//XXX import { VirtualFileSystem } from "../utils/VirtualFileSystem"
//XXX import { TContentConfig } from "../providers/ContentProvider"


//XXX export interface IContent {
//XXX     EntityName: string
//XXX     Config: TContentConfig   //XXX raw configuration
//XXX     Params: unknown            //XXX TS transformed configuration
//XXX     Content: VirtualFileSystem

//XXX     SetConfig(contentConfig: TContentConfig): void
//XXX     InitContent(name: string, content: Readable): void
//XXX     Get(sqlQuery?: string): Promise<DataTable>
//XXX     Set(contentDataTable: DataTable): Promise<Readable>
//XXX }
