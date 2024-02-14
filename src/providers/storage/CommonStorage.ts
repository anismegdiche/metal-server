//
//
//
//
//
import { TSourceParams } from "../../types/TSourceParams"
import { TFileProviderOptions } from "../FilesProvider"

/* eslint-disable no-unused-vars */
export interface IStorage {
    Params: TSourceParams
    Options: TFileProviderOptions
    Connect(): Promise<void>
    Disconnect(): Promise<void>
    IsExist(file: string): Promise<boolean>
    Read(file: string): Promise<string | undefined>
    Write(file: string, content: string): Promise<void>
}
/* eslint-enable no-unused-vars */

export class CommonStorage {

    Params: TSourceParams
    Options: TFileProviderOptions

    constructor(storageParams: TSourceParams) {
        this.Params = storageParams
        this.Options = storageParams.options as TFileProviderOptions
    }

    // eslint-disable-next-line class-methods-use-this
    async Connect(): Promise<void> {
        //
    }

    // eslint-disable-next-line class-methods-use-this
    async Disconnect(): Promise<void> {
        //
    }

    // eslint-disable-next-line class-methods-use-this
    async IsExist(file: string): Promise<boolean> {
        return true
    }

    // eslint-disable-next-line class-methods-use-this
    async Read(file: string): Promise<string | undefined> {
        return undefined
    }

    // eslint-disable-next-line class-methods-use-this
    async Write(file: string, content: string): Promise<void> {
        //
    }

    // eslint-disable-next-line class-methods-use-this
    async StreamToBuffer(stream: NodeJS.ReadableStream): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: any[] = []
            stream.on('data', (chunk) => chunks.push(chunk))
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
            stream.on('error', (error) => reject(error))
        })
    }
}

