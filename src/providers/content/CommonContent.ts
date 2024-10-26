
//
//
//
//
//
import { PassThrough, Readable } from "node:stream"
import { TContentConfig } from "../data/FilesDataProvider"
import { VirtualFileSystem } from "../../utils/VirtualFileSystem "


export class CommonContent {

    EntityName: string = "DEFAULT"
    Options: TContentConfig
    RawContent?: string = undefined
    Content = new VirtualFileSystem()

    constructor(contentConfig: TContentConfig) {
        this.Options = contentConfig
    }

    static async ReadableToString(readable: Readable): Promise<string> {
        let result = ''

        return new Promise((resolve, reject) => {
            readable.on('data', (chunk) => {
                result += chunk.toString() // Convert each chunk to string and append
            })

            readable.on('end', () => {
                resolve(result) // Resolve with the complete string
            })

            readable.on('error', (err) => {
                reject(err) // Reject on error
            })
        })
    }

    static async ReadableToBuffer(stream: Readable): Promise<Buffer> {
        const chunks: any[] = []
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk))
            stream.on('end', () => resolve(Buffer.concat(chunks)))
            stream.on('error', reject)
        })
    }

    static DuplicateReadable(original: Readable): [Readable, Readable] {
        const passThrough1 = new PassThrough()
        const passThrough2 = new PassThrough()

        original.pipe(passThrough1)
        original.pipe(passThrough2)

        return [passThrough1, passThrough2]
    }
}