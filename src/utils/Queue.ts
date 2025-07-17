/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
//
//
//

export type TQueueFunction = Function | void

//
export class Queue {

    readonly #Tasks: (TQueueFunction)[]
    #IsRunning: boolean

    constructor() {
        this.#Tasks = []
        this.#IsRunning = false
    }

    async Enqueue(task: TQueueFunction): Promise<void> {
        this.#Tasks.push(task)
        if (!this.#IsRunning)
            this.#ProcessQueue()
    }

    async #ProcessQueue(): Promise<void> {
        this.#IsRunning = true
        while (this.#IsRunning && this.#Tasks.length > 0) {
            const task = this.#Tasks.shift()
            if (task)
                await task()
        }
        this.#IsRunning = false
    }
}
