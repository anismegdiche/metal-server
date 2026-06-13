import * as zmq from "zeromq"

export class ZmqSubscriber {
	private socket!: zmq.Subscriber
	private handlers = new Map<string, ((payload: any) => Promise<void>)[]>()
	private listenPromise: Promise<void> | null = null

	async connect(address: string) {
		this.socket = new zmq.Subscriber()

		// Subscribe BEFORE connect to avoid missing messages during handshake
		for (const topic of this.handlers.keys()) {
			this.socket.subscribe(topic)
		}

		this.socket.connect(address)
		this.listenPromise = this.listen()

		// Give ZMQ time to establish the TCP connection
		await new Promise((r) => setTimeout(r, 500))
	}

	async disconnect() {
		if (this.socket) {
			this.socket.close()
		}
	}

	register(topic: string, handler: (payload: any) => Promise<void>) {
		if (!this.handlers.has(topic)) {
			this.handlers.set(topic, [])
		}

		this.handlers.get(topic)!.push(handler)
		console.log(`[Subscriber] Registered handler for topic: ${topic}`)

		if (this.socket) {
			this.socket.subscribe(topic)
			console.log(`[Subscriber] Subscribed to topic: ${topic}`)
		}
	}

	private async listen() {
		try {
			console.log(`[Subscriber] Starting to listen for messages...`)
			for await (const [topicBuf, msgBuf] of this.socket) {
				const topic = topicBuf.toString()
				const payload = JSON.parse(msgBuf.toString())
				const handlers = this.handlers.get(topic) ?? []

				console.log(`[Subscriber] Received message on topic: ${topic}, handlers: ${handlers.length}`)
				
				try {
					await Promise.all(handlers.map(async (h) => {
						try {
							await h(payload)
						} catch (err) {
							console.error(`[Subscriber] Handler error for topic ${topic}:`, err)
						}
					}))
				} catch (err) {
					console.error(`[Subscriber] Error processing handlers for ${topic}:`, err)
				}
			}
		} catch (err) {
			console.error("Subscriber listen error:", err)
		}
	}
}
