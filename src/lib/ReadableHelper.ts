//
//
//
//
//
import { PassThrough, Readable, Writable } from 'node:stream'
import { ReadStream } from 'node:fs'
//
import { Logger } from "../utils/Logger"


export class ReadableHelper {

    @Logger.LogFunction(true)
    static async ToString(readable: Readable): Promise<string> {
        let result = ''

        return new Promise((resolve, reject) => {
            let hasData = false

            readable.on('data', (chunk) => {
                hasData = true
                result += chunk.toString() // Convert each chunk to string and append
            })

            readable.on('end', () => {
                if (hasData) {
                    resolve(result) // Resolve with the complete string
                } else {
                    resolve('') // If no data was received, resolve with an empty string
                }
            })

            readable.on('error', (err) => {
                reject(err) // Reject on error
            })
        })
    }

    @Logger.LogFunction(true)
    static async ToBuffer(stream: Readable): Promise<Buffer> {
        const chunks: any[] = []
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk))
            stream.on('end', () => resolve(Buffer.concat(chunks)))
            stream.on('error', reject)
        })
    }

    @Logger.LogFunction(true)
    static ToWritable(readable: Readable): Writable {
        const writable = new PassThrough()
        readable.pipe(writable)
        return writable
    }

    @Logger.LogFunction(true)
    static FromWritable(writable: Writable): Readable {
        const readable = new PassThrough()
        writable.pipe(readable)
        return readable
    }


    @Logger.LogFunction(true)
    static async FromBuffer(buffer: Buffer): Promise<Readable> {
        return Readable.from(buffer)
    }

    static FromReadStream(readStream: ReadStream): Readable {
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


    @Logger.LogFunction(true)
    static Duplicate(original: Readable): [Readable, Readable] {
        const passThrough1 = new PassThrough()
        const passThrough2 = new PassThrough()

        original.pipe(passThrough1)
        original.pipe(passThrough2)

        return [passThrough1, passThrough2]
    }
}