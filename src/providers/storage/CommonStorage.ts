//
//
//
//
//
import { Logger } from "../../utils/Logger"
import { TSourceParams } from "../../types/TSourceParams"
import { TFilesDataProviderOptions } from "../data/FilesDataProvider"
import { HttpErrorNotImplemented } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"

 
export class CommonStorage {

    Params: TSourceParams
    Options: TFilesDataProviderOptions

    constructor(storageParams: TSourceParams) {
        this.Params = storageParams
        this.Options = storageParams.options as TFilesDataProviderOptions
        this.Init()
    }
     
    @Logger.LogFunction()
    Init(): void {
        //
    }
     
    @Logger.LogFunction()
    async Connect(): Promise<void> {
        //
    }
     
    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        //
    }
     
     
    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        return true
    }
     
     
    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Read(file: string): Promise<string> {
        throw new HttpErrorNotImplemented()
    }
     
     
    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Write(file: string, content: string): Promise<void> {
        //
    }
    
    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async List(): Promise<DataTable> {
        throw new HttpErrorNotImplemented()
    }
     
    @Logger.LogFunction()
    async StreamToBuffer(stream: NodeJS.ReadableStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = []
            stream.on('data', (chunk: Buffer) => chunks.push(chunk))
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
            stream.on('error', (error) => reject(error))
        })
    }
}