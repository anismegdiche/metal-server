import "reflect-metadata"
import { GetMetricsTcpAddress } from "@metal/config"
import { autoDiscover } from "@metal/messaging/auto-discover"
import { ZmqSubscriber } from "@metal/messaging/subscriber"
import { MetricsConsumer } from "./metrics.consumer"
import { MetricsRepository } from "./metrics.repository"



async function bootstrap() {
	
	const METRICS_ADDRESS = GetMetricsTcpAddress()
	const subscriber = new ZmqSubscriber()

	const repository = new MetricsRepository()
	const consumer = new MetricsConsumer(repository)

	const { discoverHandlers } = await import("@metal/messaging/registry")
	const handlers = discoverHandlers(consumer)

	for (const h of handlers) {
		subscriber.register(h.topic, h.handler)
		console.log(`[Bootstrap] Registered handler for topic: ${h.topic}`)
	}

	await subscriber.connect(METRICS_ADDRESS)

	console.log(`Metrics collector listening on ${METRICS_ADDRESS}`)
}

bootstrap()
