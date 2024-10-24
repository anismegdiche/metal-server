//
//
//
//
//
import { Readable } from "node:stream"
//
import { Logger } from "../../utils/Logger"
import { TSourceParams } from "../../types/TSourceParams"
import { TFilesDataProviderOptions } from "../data/FilesDataProvider"
import { HttpErrorNotImplemented } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { ReadStream } from "fs"


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
    async Read(file: string): Promise<Readable> {
        throw new HttpErrorNotImplemented()
    }


    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Write(file: string, content: Readable): Promise<void> {
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

    ConvertReadStreamToReadable(readStream: ReadStream): Readable {
        const readableStream = new Readable({
            read() {
                // No-op, because we're manually pushing data
            }
        })

        // Pipe data from ReadStream into Readable
        readStream.on('data', (chunk) => {
            readableStream.push(chunk)  // Push data into the new Readable stream
        })

        readStream.on('end', () => {
            readableStream.push(null)  // Signal the end of the stream
        })

        readStream.on('error', (err) => {
            readableStream.emit('error', err)  // Forward any errors
        })

        return readableStream
    }

}