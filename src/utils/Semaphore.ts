//
//
//
//
//

class Semaphore {
    #Tasks: (() => void)[] = [];
    #Available: number

    constructor(maxConcurrency: number) {
        this.#Available = maxConcurrency
    }

    async Acquire(): Promise<void> {
        if (this.#Available > 0) {
            this.#Available--
            return Promise.resolve()
        }
        return new Promise((resolve) => this.#Tasks.push(resolve))
    }

    Release(): void {
        if (this.#Tasks.length > 0) {
            const nextTask = this.#Tasks.shift()
            if (nextTask) 
                nextTask()
        } else {
            this.#Available++
        }
    }
}
