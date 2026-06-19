// for testing
// for testing
// for testing
import { MetricsGetDataPath } from "@metal/config"
import { Injectable } from "@metal/messaging/di/container"
import PersistentMap from "@metal/persistent-map"

//
export interface MetricsData {
	id: string
	cpu: number
	ram?: number
}

const db = new PersistentMap<MetricsData>(MetricsGetDataPath())

for (const [key, value] of await db.entries()) {
	console.log(`[MetricsRepository] Key: ${key}, Value:`, value)
}

//
@Injectable()
export class MetricsRepository {
	async save(data: MetricsData): Promise<void> {
		await db.set(data.id, data)
	}

	async findById(id: string): Promise<MetricsData | undefined> {
		return db.get(id)
	}
}
