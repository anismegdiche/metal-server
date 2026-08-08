//
//
//

import type { ReadStream } from "node:fs"
import { PassThrough, Readable, type Writable } from "node:stream"
//

export class ReadableUtils {
	static async ToString(readable: Readable): Promise<string> {
		let result = ""

		if (!readable.readable) return result

		return new Promise((resolve, reject) => {
			let hasData = false

			const onData = (chunk: any) => {
				hasData = true
				result += chunk.toString()
			}

			const onEnd = () => {
				cleanup()
				resolve(hasData ? result : "")
			}

			const onError = (err: Error) => {
				cleanup()
				reject(err)
			}

			const cleanup = () => {
				readable.removeListener("data", onData)
				readable.removeListener("end", onEnd)
				readable.removeListener("error", onError)
			}

			readable.on("data", onData)
			readable.on("end", onEnd)
			readable.on("error", onError)
		})
	}

	static async ToBuffer(stream: Readable): Promise<Buffer> {
		const chunks: any[] = []
		return new Promise((resolve, reject) => {
			const onData = (chunk: any) => chunks.push(chunk)

			const onEnd = () => {
				cleanup()
				resolve(Buffer.concat(chunks))
			}

			const onError = (err: Error) => {
				cleanup()
				reject(err)
			}

			const cleanup = () => {
				stream.removeListener("data", onData)
				stream.removeListener("end", onEnd)
				stream.removeListener("error", onError)
			}

			stream.on("data", onData)
			stream.on("end", onEnd)
			stream.on("error", onError)
		})
	}

	static ToWritable(readable: Readable): Writable {
		const writable = new PassThrough()
		readable.pipe(writable)
		return writable
	}

	static FromWritable(writable: Writable): Readable {
		const readable = new PassThrough()
		writable.pipe(readable)
		return readable
	}

	static async FromBuffer(buffer: Buffer): Promise<Readable> {
		return Readable.from(buffer)
	}

	static FromReadStream(readStream: ReadStream): Readable {
		// Readable.from() consumes the source via async iteration, respecting
		// backpressure (the source is only read when the consumer asks for more).
		return Readable.from(readStream)
	}

	static Duplicate(original: Readable): [Readable, Readable] {
		const passThrough1 = new PassThrough()
		const passThrough2 = new PassThrough()

		original.pipe(passThrough1)
		original.pipe(passThrough2)

		return [passThrough1, passThrough2]
	}

	static async ToBase64(readable: Readable | undefined): Promise<string> {
		const chunks: Buffer[] = []
		if (readable)
			for await (const chunk of readable) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
			}
		return Buffer.concat(chunks).toString("base64")
	}

	static FromReadableStream(stream: NodeJS.ReadableStream): Readable {
		// Readable.from() respects backpressure via async iteration instead of
		// attaching a 'data' listener that forces the source into flowing mode.
		return Readable.from(stream as AsyncIterable<unknown>)
	}
}
