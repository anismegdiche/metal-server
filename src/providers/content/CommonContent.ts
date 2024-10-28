
//
//
//
//
//
import { Readable } from "node:stream"
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
}