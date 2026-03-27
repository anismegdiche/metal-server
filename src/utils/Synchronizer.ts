//
//
//
import { Logger } from "./Logger"

//
export class Synchronizer {
	#IsExecuting = false

	#Result: any

	#PendingPromises: ((result: any) => void)[] //NOSONAR

	#Waiters = 0

	constructor() {
		this.#PendingPromises = []
	}

	async Execute<T>(fn: () => Promise<T>): Promise<T> {
		if (this.#Waiters === 0) this.#Result = undefined

		if (this.#Result) {
			this.#Waiters--
			Logger.Debug(`${Logger.Out} Synchronizer.Execute (${fn.name}): Returning cached result`)
			Logger.Debug(`${Logger.Out} Synchronizer.Execute (${fn.name}): Waiters = ${this.#Waiters}`)
			return this.#Result as T // Return cached result if available
		}

		if (this.#IsExecuting) {
			Logger.Debug(`${Logger.Out} Synchronizer.Execute (${fn.name}): Call queued`)
			this.#Waiters++
			Logger.Debug(`${Logger.Out} Synchronizer.Execute (${fn.name}): Waiters = ${this.#Waiters}`)
			return new Promise<T>((resolve) => {
				this.#PendingPromises.push(resolve as (result: T) => void)
			})
		}

		this.#IsExecuting = true
		try {
			this.#Waiters++
			Logger.Debug(`${Logger.Out} Synchronizer.Execute (${fn.name}): Waiters = ${this.#Waiters}`)
			this.#Result = await fn()
			this.#Waiters--
			Logger.Debug(`${Logger.Out} Synchronizer.Execute (${fn.name}): Returning result for the first caller`)
			Logger.Debug(`${Logger.Out} Synchronizer.Execute (${fn.name}): Waiters = ${this.#Waiters}`)
			return this.#Result as T
		} finally {
			this.#IsExecuting = false
			this.#ResolvePendingPromises(fn.name)
		}
	}

	#ResolvePendingPromises(fnName: string): void {
		while (this.#PendingPromises.length > 0) {
			this.#Waiters--
			Logger.Debug(`${Logger.Out} Synchronizer.Execute (${fnName}): Returning cached result`)
			Logger.Debug(`${Logger.Out} Synchronizer.Execute (${fnName}): Waiters = ${this.#Waiters}`)
			const resolve = this.#PendingPromises.shift()
			if (resolve) resolve(this.#Result)
		}
	}
}
