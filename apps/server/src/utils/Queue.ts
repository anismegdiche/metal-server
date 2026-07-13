//
//
//


// biome-ignore lint/complexity/noBannedTypes: ignore
type TQueueFunction = Function | undefined | void


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
		const promises: Promise<void>[] = []
		while (this.IsRunning && this.Tasks.length > 0) {
			const task = this.Tasks.shift()
			if (task)
				if (wait) await task()
				else promises.push(task())
		}
		if (!wait) await Promise.all(promises)

		this.IsRunning = false
	}

	async Enqueue(task: TQueueFunction, wait: boolean = true): Promise<void> {
		if (!task) return

		this.Tasks.push(task)
		if (!this.IsRunning) this.ProcessQueue(wait)
	}

	static AddToQueue(queue: Queue) {
		return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
			const originalMethod = descriptor.value

			descriptor.value = function (...args: any[]) {
				return new Promise((resolve, reject) => {
					queue.Enqueue(async () => {
						try {
							resolve(await originalMethod.apply(this, args))
						} catch (error) {
							reject(error)
						}
					})
				})
			}

			return descriptor
		}
	}
}
