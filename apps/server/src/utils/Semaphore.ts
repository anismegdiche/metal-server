//
//
//

import { Logger } from "./Logger"

export class Semaphore {
	#Tasks: (() => void)[] = [] 
	#Available: number = 0

	constructor(maxConcurrency: number) {
		this.#Available = maxConcurrency
	}

	async Acquire(): Promise<void> {
		if (this.#Available > 0) {
			this.#Available--
			Logger.Debug(`${Logger.Out} Semaphore.Acquire: remaining ${this.#Available}`)
			return
		}
		return new Promise((resolve) => {
			this.#Tasks.push(resolve)
		})
	}

	Release(): void {
		if (this.#Tasks.length > 0) {
			const nextTask = this.#Tasks.shift()
			if (nextTask) nextTask()
			return
		}
		this.#Available++
		Logger.Debug(`${Logger.Out} Semaphore.Release: remaining ${this.#Available}`)
	}
}
