import { ZmqPublisher } from "@metal/messaging/publisher"

async function main() {
	const publisher = new ZmqPublisher()

	await publisher.bind("tcp://*:5555")

	console.log("API publishing on tcp://*:5555")

	// Wait for subscriber to be ready
	await new Promise((r) => setTimeout(r, 1000))

	// Valid event — passes Validate schema
	await publisher.publish("METRICS:ADD", {
		id: "123",
		cpu: 0.75,
		ram: 16,
	})

	console.log("Published METRICS:ADD event")

	// Keep process alive to allow ZMQ to flush the send buffer
	await new Promise((r) => setTimeout(r, 1000))

	console.log("Done")
}

main()
