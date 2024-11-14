//
//
//
//
//
import { PassThrough, Readable, Writable } from 'node:stream'
//
import { Logger } from "../utils/Logger"


export class ReadableHelper {

    @Logger.LogFunction(Logger.Debug, true)
    static async ToString(readable: Readable): Promise<string> {
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

    @Logger.LogFunction(Logger.Debug, true)
    static async ToBuffer(stream: Readable): Promise<Buffer> {
        const chunks: any[] = []
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk))
            stream.on('end', () => resolve(Buffer.concat(chunks)))
            stream.on('error', reject)
        })
    }

    @Logger.LogFunction(Logger.Debug, true)
    static ToWritable(readable: Readable): Writable {
        const writable = new PassThrough()
        readable.pipe(writable)
        return writable
    }

    @Logger.LogFunction(Logger.Debug, true)
    static FromWritable(writable: Writable): Readable {
        const readable = new PassThrough()
        writable.pipe(readable)
        return readable
    }

    @Logger.LogFunction(Logger.Debug, true)
    static Duplicate(original: Readable): [Readable, Readable] {
        const passThrough1 = new PassThrough()
        const passThrough2 = new PassThrough()

        original.pipe(passThrough1)
        original.pipe(passThrough2)

        return [passThrough1, passThrough2]
    }
}