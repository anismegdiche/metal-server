//
//
//
import { GetMetricsDataPath } from "@metal/config"
import { Injectable } from "@metal/messaging/di/container"
import PersistentMap from "@metal/persistent-map"


//
export interface MetricsData {
	id: string
	metrics: Record<string, any>
}


//
const db = new PersistentMap<MetricsData>(GetMetricsDataPath())


//
@Injectable()
export class MetricsRepository {
	async save(data: MetricsData): Promise<void> {
		db.set(data.id, data.metrics)
	}

	async findById(id: string): Promise<MetricsData | undefined> {
		return db.get(id)
	}

	async findAll(): Promise<[string, MetricsData][]> {
		return db.entries()
	}

	async delete(id: string): Promise<void> {
		db.delete(id)
	}
}
