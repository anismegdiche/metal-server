/* eslint-disable @typescript-eslint/no-unsafe-function-type */
//
//
//


//
type TQueueFunction = Function | void


//
export class Queue {

    IsRunning: boolean
    readonly Tasks: (TQueueFunction)[]

    constructor() {
        this.Tasks = []
        this.IsRunning = false
    }

    async ProcessQueue(): Promise<void> {
        this.IsRunning = true
        while (this.IsRunning && this.Tasks.length > 0) {
            const tasks = this.Tasks.splice(0)
            await Promise.all(tasks.map(task => task && task()))
        }
        this.IsRunning = false
    }

    async Enqueue(task: TQueueFunction): Promise<void> {
        this.Tasks.push(task)
        if (!this.IsRunning)
            this.ProcessQueue()
    }
}
