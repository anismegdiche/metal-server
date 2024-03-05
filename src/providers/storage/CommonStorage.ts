//
//
//
//
//
import { TSourceParams } from "../../types/TSourceParams"
import { TFilesDataProviderOptions } from "../data/FilesDataProvider"

/* eslint-disable no-unused-vars */
export interface IStorage {
    Params: TSourceParams
    Options: TFilesDataProviderOptions
    Init(): void
    Connect(): Promise<void>
    Disconnect(): Promise<void>
    IsExist(file: string): Promise<boolean>
    Read(file: string): Promise<string | undefined>
    Write(file: string, content: string): Promise<void>
}
/* eslint-enable no-unused-vars */

export class CommonStorage {

    Params: TSourceParams
    Options: TFilesDataProviderOptions

    constructor(storageParams: TSourceParams) {
        this.Params = storageParams
        this.Options = storageParams.options as TFilesDataProviderOptions
        this.Init()
    }

    // eslint-disable-next-line class-methods-use-this
    Init(): void {
        //
    }

    // eslint-disable-next-line class-methods-use-this
    async Connect(): Promise<void> {
        //
    }

    // eslint-disable-next-line class-methods-use-this
    async Disconnect(): Promise<void> {
        //
    }

    // eslint-disable-next-line class-methods-use-this, no-unused-vars
    async IsExist(file: string): Promise<boolean> {
        return true
    }

    // eslint-disable-next-line class-methods-use-this, no-unused-vars
    async Read(file: string): Promise<string | undefined> {
        return undefined
    }

    // eslint-disable-next-line class-methods-use-this, no-unused-vars
    async Write(file: string, content: string): Promise<void> {
        //
    }

    // eslint-disable-next-line class-methods-use-this
    async StreamToBuffer(stream: NodeJS.ReadableStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = []
            stream.on('data', (chunk: Buffer) => chunks.push(chunk))
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
            stream.on('error', (error) => reject(error))
        })
    }
}


