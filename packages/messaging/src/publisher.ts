import * as zmq from "zeromq"

export class ZmqPublisher {
	private socket = new zmq.Publisher()

	async bind(address: string) {
		await this.socket.bind(address)
	}

	async publish(topic: string, payload: unknown) {
		const msgStr = JSON.stringify(payload)
		console.log(`[Publisher] Publishing to ${topic}: ${msgStr}`)
		await this.socket.send([topic, msgStr])
	}
}
