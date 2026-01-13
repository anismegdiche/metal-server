/* eslint-disable @typescript-eslint/no-unsafe-function-type */
//
//
//


//
type TQueueFunction = Function | void


//
export class Queue {

    IsRunning: boolean
    readonly Tasks: TQueueFunction[]

    constructor() {
        this.Tasks = []
        this.IsRunning = false
    }

    async ProcessQueue(wait: boolean = true): Promise<void> {
        this.IsRunning = true
        const promises: Promise<void>[] = [];
        while (this.IsRunning && this.Tasks.length > 0) {
            const task = this.Tasks.shift()
            if (task)
                if (wait)
                    await task()
                else
                    promises.push(task())
        }
        if (!wait)
            await Promise.all(promises)

        this.IsRunning = false
    }

    async Enqueue(task: TQueueFunction, wait: boolean = true): Promise<void> {
        if (!task)
            return

        this.Tasks.push(task)
        if (!this.IsRunning)
            this.ProcessQueue(wait)
    }
}
